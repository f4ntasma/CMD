import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Las páginas públicas se renderizan en el servidor (buscadores y primera carga rápida).
 * Lo que depende de la sesión se renderiza en el navegador: el servidor no conoce al usuario.
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: 'mi-aprendizaje', renderMode: RenderMode.Client },
  { path: 'perfil', renderMode: RenderMode.Client },
  { path: 'ingresar', renderMode: RenderMode.Client },
  { path: 'registro', renderMode: RenderMode.Client },
  { path: 'recuperar', renderMode: RenderMode.Client },
  { path: 'restablecer', renderMode: RenderMode.Client },
  { path: 'verificar-correo', renderMode: RenderMode.Client },
  { path: 'cursos/:slug/clase/:lessonId', renderMode: RenderMode.Client },
  { path: 'cursos/:slug/cuestionario/:quizId', renderMode: RenderMode.Client },
  { path: 'cursos/:slug/comprar', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
