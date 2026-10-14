import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/guards';
import { ORGANIZATION_JSON_LD, RouteSeo, SITE_NAME, SITE_URL } from './core/seo';

/** Páginas personales o de formularios: no aportan a los buscadores. */
const PRIVATE = { seo: { noindex: true } satisfies RouteSeo };

const TITLE = " · Monkey Coffe Dev's";

export const routes: Routes = [
  { path: '', title: "Monkey Coffe Dev's — Academia de programación en español",
    data: {
      seo: {
        jsonLd: {
          '@graph': [
            ORGANIZATION_JSON_LD,
            { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL, inLanguage: 'es' },
          ],
        },
      } satisfies RouteSeo,
    },
    loadComponent: () => import('./pages/home').then((m) => m.Home) },

  { path: 'cursos', title: 'Cursos de programación' + TITLE, data: { seo: { description: 'Cursos en español de programación básica, POO, bases de datos, ciberseguridad e inteligencia artificial. Gratuitos y premium, con certificado verificable.' } satisfies RouteSeo }, loadComponent: () => import('./pages/courses').then((m) => m.Courses) },
  { path: 'cursos/:slug', loadComponent: () => import('./pages/course-detail').then((m) => m.CourseDetailPage) },
  { path: 'cursos/:slug/clase/:lessonId', data: PRIVATE, loadComponent: () => import('./pages/player').then((m) => m.Player) },
  {
    path: 'cursos/:slug/cuestionario/:quizId',
    canActivate: [authGuard],
    data: PRIVATE,
    loadComponent: () => import('./pages/quiz').then((m) => m.QuizPage),
  },
  {
    path: 'cursos/:slug/comprar',
    canActivate: [authGuard],
    title: 'Comprar curso' + TITLE, data: PRIVATE,
    loadComponent: () => import('./pages/checkout').then((m) => m.Checkout),
  },

  { path: 'rutas', title: 'Rutas de aprendizaje' + TITLE, data: { seo: { description: 'Rutas de aprendizaje: cursos ordenados para llevarte de cero a un objetivo concreto en programación, datos, ciberseguridad o IA.' } satisfies RouteSeo }, loadComponent: () => import('./pages/paths').then((m) => m.Paths) },
  { path: 'rutas/:slug', loadComponent: () => import('./pages/paths').then((m) => m.PathDetailPage) },

  { path: 'blog', title: 'Blog' + TITLE, data: { type: 'ARTICLE', seo: { description: 'Artículos y guías de programación, bases de datos, ciberseguridad e inteligencia artificial en español.' } satisfies RouteSeo }, loadComponent: () => import('./pages/posts').then((m) => m.Posts) },
  { path: 'noticias', title: 'Noticias' + TITLE, data: { type: 'NEWS', seo: { description: 'Novedades de la academia: cursos nuevos, eventos y anuncios de la comunidad.' } satisfies RouteSeo }, loadComponent: () => import('./pages/posts').then((m) => m.Posts) },
  { path: 'publicaciones/:slug', loadComponent: () => import('./pages/posts').then((m) => m.PostDetailPage) },

  { path: 'certificados/:code', title: 'Verificar certificado' + TITLE, data: PRIVATE, loadComponent: () => import('./pages/certificate').then((m) => m.CertificatePage) },

  { path: 'ingresar', canActivate: [guestGuard], title: 'Ingresar' + TITLE, data: PRIVATE, loadComponent: () => import('./pages/auth').then((m) => m.Login) },
  { path: 'registro', canActivate: [guestGuard], title: 'Crear cuenta' + TITLE, data: PRIVATE, loadComponent: () => import('./pages/auth').then((m) => m.Register) },
  { path: 'recuperar', title: 'Recuperar contraseña' + TITLE, data: PRIVATE, loadComponent: () => import('./pages/auth').then((m) => m.ForgotPassword) },
  { path: 'restablecer', title: 'Nueva contraseña' + TITLE, data: PRIVATE, loadComponent: () => import('./pages/auth').then((m) => m.ResetPassword) },
  { path: 'verificar-correo', title: 'Verificar correo' + TITLE, data: PRIVATE, loadComponent: () => import('./pages/auth').then((m) => m.VerifyEmail) },

  {
    path: 'mi-aprendizaje',
    canActivate: [authGuard],
    title: 'Mi aprendizaje' + TITLE, data: PRIVATE,
    loadComponent: () => import('./pages/my-learning').then((m) => m.MyLearning),
  },
  { path: 'perfil', canActivate: [authGuard], title: 'Mi perfil' + TITLE, data: PRIVATE, loadComponent: () => import('./pages/profile').then((m) => m.Profile) },

  {
    path: 'admin',
    canActivate: [adminGuard],
    title: 'Panel' + TITLE, data: PRIVATE,
    loadComponent: () => import('./pages/admin/admin-shell').then((m) => m.AdminShell),
    children: [
      { path: '', loadComponent: () => import('./pages/admin/dashboard').then((m) => m.Dashboard) },
      { path: 'cursos', loadComponent: () => import('./pages/admin/courses').then((m) => m.AdminCourses) },
      { path: 'cursos/:id', loadComponent: () => import('./pages/admin/course-editor').then((m) => m.CourseEditor) },
      { path: 'categorias', loadComponent: () => import('./pages/admin/categories').then((m) => m.AdminCategories) },
      { path: 'rutas', loadComponent: () => import('./pages/admin/paths').then((m) => m.AdminPaths) },
      { path: 'publicaciones', loadComponent: () => import('./pages/admin/posts').then((m) => m.AdminPosts) },
      { path: 'ordenes', loadComponent: () => import('./pages/admin/orders').then((m) => m.AdminOrders) },
      { path: 'comentarios', loadComponent: () => import('./pages/admin/comments').then((m) => m.AdminComments) },
      { path: 'usuarios', loadComponent: () => import('./pages/admin/users').then((m) => m.AdminUsers) },
      { path: 'ajustes', loadComponent: () => import('./pages/admin/settings').then((m) => m.AdminSettings) },
    ],
  },

  { path: '**', title: 'No encontrado' + TITLE, data: PRIVATE, loadComponent: () => import('./pages/not-found').then((m) => m.NotFound) },
];
