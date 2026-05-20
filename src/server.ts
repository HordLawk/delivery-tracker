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

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
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

app.get('/api/items', (req, res) => {
    res.json(deliveryItems);
});

app.get('/api/items/:id', (req, res) => {
    const itemId = parseInt(req.params.id, 10);
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
