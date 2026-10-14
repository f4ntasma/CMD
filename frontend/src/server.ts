import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { request as httpRequest } from 'node:http';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

/** Backend de la academia. En producción es una dirección de la red interna, nunca pública. */
const API_URL = process.env['API_URL'] ?? 'http://localhost:8080';
/** Rutas que atiende el backend: la API y el ida y vuelta del login con Google, GitHub y Discord. */
const BACKEND_PATHS = ['/api/', '/oauth2/', '/login/oauth2/'];

const app = express();
/**
 * Dominios desde los que se sirve el sitio (NG_ALLOWED_HOSTS, separados por comas). Con otro dominio, Angular
 * no renderiza en el servidor y entrega la versión de navegador: protege contra cabeceras Host falsas.
 */
const allowedHosts = (process.env['NG_ALLOWED_HOSTS'] ?? 'localhost')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);
// Siempre corre detrás de un proxy (Traefik, Vercel) que añade X-Forwarded-*. Se confía en esas cabeceras,
// pero el host resultante sigue validándose contra allowedHosts.
const angularApp = new AngularNodeAppEngine({ allowedHosts, trustProxyHeaders: true });

/**
 * Reenvía al backend lo que le corresponde, de modo que navegador y API compartan origen: la cookie de
 * sesión y el token CSRF funcionan sin CORS. Se conservan el host y el protocolo originales para que el
 * backend construya bien las direcciones de retorno del login social.
 */
app.use((req, res, next) => {
  if (!BACKEND_PATHS.some((path) => req.url.startsWith(path))) {
    next();
    return;
  }
  const target = new URL(req.url, API_URL);
  const upstream = httpRequest(
    target,
    {
      method: req.method,
      headers: {
        ...req.headers,
        host: target.host,
        'x-forwarded-host': req.headers['x-forwarded-host'] ?? req.headers.host ?? '',
        'x-forwarded-proto': req.headers['x-forwarded-proto'] ?? req.protocol,
        'x-forwarded-for': req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '',
      },
    },
    (response) => {
      res.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(res);
    },
  );
  upstream.on('error', () => {
    if (!res.headersSent) {
      res.status(502).json({ status: 502, detail: 'El servidor de la academia no responde. Inténtalo en un momento.' });
    }
  });
  req.pipe(upstream);
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
app.use((req, res, next) => {
  // Traefik añade X-Forwarded-Server, que Angular no reconoce y por la que rechaza renderizar en servidor.
  delete req.headers['x-forwarded-server'];
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
