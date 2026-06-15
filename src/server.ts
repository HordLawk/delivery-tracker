import {
    AngularNodeAppEngine,
    createNodeRequestHandler,
    isMainModule,
    writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Deliveryitem } from './app/deliveryitem.interface';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import session from 'express-session';
import { User } from './app/user.interface';
import jwt from 'jsonwebtoken';
import postgres from 'postgres';
import * as jose from 'jose'

declare module 'express-session' {
    interface SessionData {
        _state?: string;
    }
}

declare global{
    namespace Express {
        interface Request {
            sub?: string;
        }
    }
}

declare module 'express' {
    interface Request {
        sub?: string;
    }
}

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const sql = postgres(process.env['DATABASE_URL'] ?? '', {
    types: {bigint: postgres.BigInt},
    transform: postgres.camel,
});

const app = express();
app.use(cookieParser());
app.use(session({
    secret: crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: (process.env['NODE_ENV'] === 'production'),
    }
}));
app.use((req, _, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
})
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/**', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

const openidConfigResponse = await fetch('https://accounts.google.com/.well-known/openid-configuration');
if(!openidConfigResponse.ok){
    console.trace(await openidConfigResponse.text());
    process.exit(1);
}
const openidConfig = await openidConfigResponse.json();
const openidKeysResponse = await fetch(openidConfig.jwks_uri);
if(!openidKeysResponse.ok){
    console.trace(await openidKeysResponse.text());
    process.exit(1);
}
const openidKeys = jose.createRemoteJWKSet(new URL(openidConfig.jwks_uri));

const verifyToken = async (idToken: string) => {
    if(!idToken) throw new Error('Invalid token');
    const {payload} = await jose.jwtVerify<jose.JWTPayload & {name: string, picture: string}>(idToken, openidKeys, {
        audience: process.env['GOOGLE_CLIENT_ID'],
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
    });
    return payload;
}

const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try{
        const decodedToken = await verifyToken(req.cookies['AUTH']);
        req.sub = decodedToken.sub;
        next();
    }
    catch(err) {
        res.status(401).json({ error: 'Invalid auth cookie' });
    }
}

const selectUserItems = async (sub: string, id?: string) => {
    return await sql`
        SELECT
            i.*,
            f.name
        FROM items i
        INNER JOIN facilities f ON i.origin_facility_id = f.id
        INNER JOIN users u ON f.sector_id = u.sector_id
        WHERE u.sub = ${sub} ${id ? sql`AND i.id = ${id}` : sql``}
    `
}

app.get('/api/session', async (req, res) => {
    try{
        await verifyToken(req.cookies['AUTH']);
        res.sendStatus(204);
    }
    catch(err) {
        const state = crypto.randomBytes(32).toString('hex');
        req.session._state = state;
        res.status(201).json({ state });
    }
});

app.get('/auth/callback', async (req, res) => {
    const { code, state } = req.query;
    if(!code || (typeof code !== 'string') || !state || (typeof state !== 'string')){
        return res.status(400).json({ error: 'Missing code or state parameter' });
    }
    const [sessionState, redirectUrl] = state.split('--');
    if(!redirectUrl || (sessionState !== req.session._state)){
        return res.status(400).json({ error: 'Invalid state parameter' });
    }
    const tokensResponse = await fetch(openidConfig.token_endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({
            code,
            client_id: process.env['GOOGLE_CLIENT_ID'] ?? '',
            client_secret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
            redirect_uri: `${process.env['BASE_URL']}/auth/callback`,
            grant_type: 'authorization_code',
        }),
    });
    if(!tokensResponse.ok){
        console.log(await tokensResponse.text());
        return res.status(500).json({ error: 'Failed to exchange code for tokens' });
    }
    const tokens = await tokensResponse.json();
    const decodedIdToken = await verifyToken(tokens.id_token);
    if(!decodedIdToken || !decodedIdToken.sub) return res.status(500).json({ error: 'Failed to exchange code for tokens' });
    const [user] = await sql<User[]>`SELECT * FROM users WHERE sub = ${decodedIdToken.sub}`;
    if(!user){
        const newUser = {
            sub: decodedIdToken.sub,
            name: decodedIdToken.name,
            pictureUrl: decodedIdToken.picture,
        }
        await sql`INSERT INTO users ${sql(newUser)}`;
    }
    return res.cookie('AUTH', tokens.id_token, {
        httpOnly: true,
        secure: (process.env['NODE_ENV'] === 'production'),
        maxAge: decodedIdToken.exp ? (decodedIdToken.exp * 1_000) : (Date.now() + (1_000 * 60 * 60)),
    }).redirect(redirectUrl || '/');
});

app.get('/api/items', authMiddleware, async (req, res) => {
    if(!req.sub) return res.sendStatus(500);
    const items = await selectUserItems(req.sub);
    return res.json(items);
});

app.get('/api/items/:id', authMiddleware, async (req, res) => {
    if(!req.sub) return res.sendStatus(500);
    const [item] = await selectUserItems(req.sub, req.params['id']);
    return res.json(item);
});

/**
 * Serve static files from /browser
 */
app.use(
    express.static(browserDistFolder, {
        maxAge: '1y',
        index: false,
        redirect: false,
    }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use('/**', (req, res, next) => {
    angularApp
        .handle(req)
        .then((response) =>
            response ? writeResponseToNodeResponse(response, res) : next(),
        )
        .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
    const port = process.env['PORT'] || 4000;
    app.listen(port, () => {
        console.log(`Node Express server listening on http://localhost:${port}`);
    });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
