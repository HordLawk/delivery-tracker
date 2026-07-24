import {
    AngularNodeAppEngine,
    createNodeRequestHandler,
    isMainModule,
    writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Deliveryitem } from './app/interfaces/deliveryitem.interface';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import session from 'express-session';
import { User } from './app/interfaces/user.interface';
import postgres from 'postgres';
import * as jose from 'jose'
import {body, param, query, validationResult} from 'express-validator'
import { Organization } from './app/interfaces/org.interface';
import { Member } from './app/interfaces/member.interface';

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
app.use(express.json());
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
    const {payload} = await jose
        .jwtVerify<jose.JWTPayload & {name: string, picture: string, email: string}>(idToken, openidKeys, {
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
    return await sql<(Deliveryitem & {originFacilityName: string})[]>`
        SELECT
            i.*,
            f.name as origin_facility_name
        FROM items i
        INNER JOIN facilities f ON i.origin_facility_id = f.id
        INNER JOIN sectors s ON s.id = f.sector_id
        INNER JOIN memberships m
            ON m.organization_id = s.organization_id
            AND (m.role = 'MANAGER' OR m.sector_id = s.id)
            AND m.confirmed = TRUE
        WHERE m.user_id = ${sub} ${id ? sql`AND i.id = ${id}` : sql``}
        ORDER BY created_at DESC
    `;
}

const selectMembership = async (
    sub: string,
    organizationId: string,
    options: {confirmed?: boolean, role?: string} = {},
) => {
    const [membership] = await sql<Member[]>`
        SELECT * FROM memberships
        WHERE
            organization_id = ${organizationId}
            AND user_id = ${sub}
            ${options.confirmed ? sql`AND confirmed = ${options.confirmed}` : sql``}
            ${options.role ? sql`AND role = ${options.role}` : sql``}
    `;
    return membership;
}

const insertMembership = async (
    options: {organizationId: string, userId: string, confirmed?: boolean, role?: string}
) => {
    const [membership] = await sql<Member[]>`INSERT INTO memberships ${sql(options)} RETURNING *`;
    return membership;
}

const handleValidation = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const result = validationResult(req);
    if(result.isEmpty()) return next();
    return res.status(400).json({errors: result.array()});
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

app.get('/auth/callback', query('code').notEmpty(), query('state').notEmpty(), handleValidation, async (req, res) => {
    const { code, state } = req.query as {code: string, state: string};
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
    if(!decodedIdToken || !decodedIdToken.sub){
        return res.status(500).json({ error: 'Failed to exchange code for tokens' });
    }
    const [user] = await sql<User[]>`SELECT * FROM users WHERE sub = ${decodedIdToken.sub}`;
    if(user){
        if(user.email !== decodedIdToken.email){
            await sql`UPDATE users SET email = ${decodedIdToken.email} WHERE sub = ${user.sub}`;
        }
    }
    else{
        const newUser = {
            sub: decodedIdToken.sub,
            name: decodedIdToken.name,
            pictureUrl: decodedIdToken.picture,
            email: decodedIdToken.email,
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

app.get('/api/items/:id', param('id').isUUID(), handleValidation, authMiddleware, async (req, res) => {
    if(!req.sub) return res.sendStatus(500);
    const [item] = await selectUserItems(req.sub, req.params['id']);
    return res.json(item);
});

app.get(
    '/api/memberships',
    query('confirmed').isBoolean().toBoolean(),
    handleValidation,
    authMiddleware,
    async (req, res) => {
        if(!req.sub) return res.sendStatus(500);
        const {confirmed} = req.query as unknown as {confirmed: boolean};
        const memberships = await sql<(
            Member & { organizationName: string; organizationOwnerId: string; organizationCreatedAt: Date }
        )[]>`
            SELECT
                m.*,
                o.name as organization_name,
                o.owner_id as organization_owner_id,
                o.created_at as organization_created_at
            FROM memberships m
            INNER JOIN organizations o ON o.id = m.organization_id
            WHERE m.user_id = ${req.sub} AND m.confirmed = ${confirmed}
            ORDER BY o.name
        `;
        return res.status(200).json(
            memberships.map(
                ({
                    organizationId,
                    userId,
                    sectorId,
                    role,
                    confirmed,
                    createdAt,
                    organizationName,
                    organizationOwnerId,
                    organizationCreatedAt,
                }) => ({
                    organizationId,
                    userId,
                    sectorId,
                    role,
                    confirmed,
                    createdAt,
                    organization: {
                        id: organizationId,
                        name: organizationName,
                        ownerId: organizationOwnerId,
                        createdAt: organizationCreatedAt,
                    },
                }),
            ),
        );
    },
);

app.get('/api/orgs/:id/memberships', param('id').isUUID(), handleValidation, authMiddleware, async (req, res) => {
    if(!req.sub) return res.sendStatus(500);
    const sub = req.sub;
    const {id} = req.params as {id: string};
    // const [organization] = await sql<Organization[]>`SELECT * FROM organizations WHERE id = ${id}`;
    // if(!organization) return res.sendStatus(404);
    const membership = await selectMembership(sub, id, {confirmed: true});
    if(!membership) return res.status(404).json({error: 'Requester membership not found'});
    const memberships = await sql<(Member & { name: string; pictureUrl: string; userCreatedAt: Date })[]>`
        SELECT
            m.*,
            u.name,
            u.picture_url,
            u.created_at as user_created_at
        FROM memberships m
        INNER JOIN users u ON u.sub = m.user_id
        WHERE m.organization_id = ${id} ${membership.role === 'MANAGER' ? sql`` : sql`AND m.confirmed = TRUE`}
        ORDER BY u.name
    `;
    return res.status(200).json(
        memberships.map(
            ({
                organizationId,
                userId,
                sectorId,
                role,
                confirmed,
                createdAt,
                name,
                pictureUrl,
                userCreatedAt,
            }) => ({
                organizationId,
                userId,
                sectorId,
                role,
                confirmed,
                createdAt,
                // organization,
                user: {
                    sub,
                    name,
                    pictureUrl,
                    createdAt: userCreatedAt,
                },
            }),
        ),
    );
});

app.post(
    '/api/orgs',
    body('name').trim().notEmpty().isLength({max: 256}),
    handleValidation,
    authMiddleware,
    async (req, res) => {
        if(!req.sub) return res.sendStatus(500);
        const sub = req.sub;
        const {name} = req.body as {name: string};
        const membership = await sql.begin(async sql => {
            const newOrg = {
                name,
                ownerId: sub,
            };
            const [organization] = await sql<Organization[]>`INSERT INTO organizations ${sql(newOrg)} RETURNING *`;
            const newMember = {
                organizationId: organization.id,
                userId: sub,
                confirmed: true,
                role: 'MANAGER',
            };
            const [membership] = await sql<Member[]>`INSERT INTO memberships ${sql(newMember)} RETURNING *`;
            membership.organization = organization;
            return membership;
        });
        return res.status(201).json(membership);
    }
);

app.post(
    '/api/orgs/:id/memberships',
    param('id').isUUID(),
    body('email').trim().isEmail(),
    handleValidation,
    authMiddleware,
    async (req, res) => {
        if(!req.sub) return res.sendStatus(500);
        const sub = req.sub;
        const {email} = req.body as {email: string};
        const {id} = req.params as {id: string};
        const ownMembership = await selectMembership(sub, id, {confirmed: true, role: 'MANAGER'});
        if(!ownMembership) return res.status(404).json({error: 'Inviter membership not found or is not a manager'});
        const [user] = await sql<User[]>`SELECT * FROM users WHERE email = ${email}`;
        if(!user) return res.status(400).json({error: 'No user with was found with the provided email'});
        const membership = await selectMembership(user.sub, id);
        if(membership) return res.status(400).json({error: 'User is already a member or has already been invited'});
        const newMembership = await insertMembership({
            organizationId: id,
            userId: user.sub,
        });
        newMembership.user = user;
        return res.status(201).json(newMembership);
    },
);

app.patch(
    '/api/memberships/:orgId',
    param('orgId').isUUID(),
    body('confirmed').optional().isBoolean().toBoolean().equals('true'),
    handleValidation,
    authMiddleware,
    async (req, res) => {
        if(!req.sub) return res.sendStatus(500);
        const sub = req.sub;
        const {confirmed} = req.body as {confirmed?: boolean};
        const {orgId} = req.params as {orgId: string};
        if(!confirmed) return res.sendStatus(204);
        const [membership] = await sql`
            UPDATE memberships
            SET ${sql({confirmed})}
            WHERE
                user_id = ${sub}
                AND organization_id = ${orgId}
            RETURNING *
        `;
        if(!membership) return res.status(404).json({error: 'Membership not found'});
        return res.sendStatus(205);
    },
);

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
