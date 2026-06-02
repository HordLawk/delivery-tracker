import {
    AngularNodeAppEngine,
    createNodeRequestHandler,
    isMainModule,
    writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Deliveryitem } from './app/deliveryitem';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import session from 'express-session';
import { User } from './app/user.interface';
import jwt from 'jsonwebtoken';
import {OAuth2Client} from 'google-auth-library';

declare module 'express-session' {
    interface SessionData {
        _state?: string;
    }
}

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

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
if(process.env['NODE_ENV'] !== 'production') app.use(cors());
const angularApp = new AngularNodeAppEngine();
const client = new OAuth2Client();

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

const deliveryItems: Deliveryitem[] = [
    {
        id: 1,
        name: 'Sample Delivery Item',
        description: 'This is a sample delivery item',
        price: 100,
        imageUrl: 'https://placehold.co/400',
        status: 0,
        startedAt: new Date(),
        endedAt: null,
        weight: 10,
        originFacility: {
            id: 1,
            name: 'Sample Facility',
            sectorId: 1
        },
        destinationAddress: '123 Sample Street, Sample City'
    },
];

const users: User[] = [];

const verifyToken = async (idToken: string) => {
    if(!idToken) throw new Error('No auth cookie');
    await client.verifyIdToken({
        idToken,
        audience: process.env['GOOGLE_CLIENT_ID'],
    });
}

const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try{
        await verifyToken(req.cookies['AUTH']);
        next();
    }
    catch(err) {
        res.status(401).json({ error: 'Invalid auth cookie' });
    }
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
    const openidConfigResponse = await fetch('https://accounts.google.com/.well-known/openid-configuration');
    if(!openidConfigResponse.ok) return res.status(500).json({ error: 'Failed to fetch OpenID Connect configuration' });
    const openidConfig = await openidConfigResponse.json();
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
    if(!tokensResponse.ok) return res.status(500).json({ error: 'Failed to exchange code for tokens' });
    const tokens = await tokensResponse.json();
    const decodedIdToken = jwt.decode(tokens.id_token) as jwt.JwtPayload & {sub: string, name: string, picture: string};
    if(!decodedIdToken || !decodedIdToken.sub) return res.status(500).json({ error: 'Failed to exchange code for tokens' });
    if(!users.some(u => u.id === decodedIdToken.sub)){
        users.push({
            id: decodedIdToken.sub,
            name: decodedIdToken.name,
            pictureUrl: decodedIdToken.picture,
        });
    }
    return res.cookie('AUTH', tokens.id_token, {
        httpOnly: true,
        secure: (process.env['NODE_ENV'] === 'production'),
        maxAge: tokens.expires_in * 1_000,
    }).redirect(redirectUrl || '/');
});

app.get('/api/items', authMiddleware, (_, res) => {
    res.json(deliveryItems);
});

app.get('/api/items/:id', authMiddleware, (req, res) => {
    const itemId = parseInt(req.params['id'], 10);
    if(!isNaN(itemId)){
        const item = deliveryItems.find((i) => i.id === itemId);
        if(item) return res.json(item);
    }
    return res.status(404).json({ error: 'Item not found' });
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
