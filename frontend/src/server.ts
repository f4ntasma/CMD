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

/** Dominio público del sitio, para las URL absolutas del mapa del sitio. */
const SITE_URL = (process.env['SITE_URL'] ?? 'https://coffemokeydevs.site').replace(/\/$/, '');
const SITEMAP_TTL_MS = 60 * 60 * 1000;
let sitemapCache: { xml: string; at: number } | null = null;

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(new URL(path, API_URL), { signal: AbortSignal.timeout(8000) });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Recorre todas las páginas de un listado paginado del backend (máximo 50 páginas por seguridad). */
async function allPages<T>(path: (page: number) => string): Promise<T[]> {
  const items: T[] = [];
  for (let page = 0; page < 50; page++) {
    const data = await getJson<{ content: T[]; totalPages: number }>(path(page));
    if (!data) break;
    items.push(...data.content);
    if (page + 1 >= data.totalPages) break;
  }
  return items;
}

/** Mapa del sitio para buscadores: páginas públicas fijas más cada curso, ruta y publicación. */
async function buildSitemap(): Promise<string> {
  const [courses, paths, posts] = await Promise.all([
    allPages<{ slug: string }>((page) => `/api/courses?page=${page}`),
    getJson<{ slug: string }[]>('/api/paths').then((list) => list ?? []),
    allPages<{ slug: string; publishedAt: string }>((page) => `/api/posts?page=${page}&size=30`),
  ]);
  const urls: { loc: string; lastmod?: string; priority: string }[] = [
    { loc: '/', priority: '1.0' },
    { loc: '/cursos', priority: '0.9' },
    { loc: '/rutas', priority: '0.8' },
    { loc: '/blog', priority: '0.6' },
    { loc: '/noticias', priority: '0.5' },
    ...courses.map((course) => ({ loc: `/cursos/${course.slug}`, priority: '0.8' })),
    ...paths.map((path) => ({ loc: `/rutas/${path.slug}`, priority: '0.7' })),
    ...posts.map((post) => ({ loc: `/publicaciones/${post.slug}`, lastmod: post.publishedAt?.slice(0, 10), priority: '0.5' })),
  ];
  const body = urls
    .map(
      (url) =>
        `  <url><loc>${escapeXml(SITE_URL + url.loc)}</loc>${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}<priority>${url.priority}</priority></url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

app.get('/sitemap.xml', async (_req, res) => {
  if (!sitemapCache || Date.now() - sitemapCache.at > SITEMAP_TTL_MS) {
    sitemapCache = { xml: await buildSitemap(), at: Date.now() };
  }
  res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(sitemapCache.xml);
});

app.get('/robots.txt', (_req, res) => {
  res
    .type('text/plain')
    .send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /api/',
        'Disallow: /mi-aprendizaje',
        'Disallow: /perfil',
        'Disallow: /ingresar',
        '',
        `Sitemap: ${SITE_URL}/sitemap.xml`,
        '',
      ].join('\n'),
    );
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
