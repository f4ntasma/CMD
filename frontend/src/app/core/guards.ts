import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

/** Exige sesión; si no la hay, lleva a iniciar sesión y recuerda a dónde se quería ir. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  await auth.ready();
  return auth.isLoggedIn() ? true : router.createUrlTree(['/ingresar'], { queryParams: { volver: state.url } });
};

export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  await auth.ready();
  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/ingresar'], { queryParams: { volver: state.url } });
  }
  return auth.isAdmin() ? true : router.createUrlTree(['/']);
};

/** Para las páginas de acceso: quien ya tiene sesión no necesita verlas. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  await auth.ready();
  return auth.isLoggedIn() ? router.createUrlTree(['/mi-aprendizaje']) : true;
};
