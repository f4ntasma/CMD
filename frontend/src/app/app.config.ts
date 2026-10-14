import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { apiOriginInterceptor } from './core/http';
import { Seo } from './core/seo';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideClientHydration(withEventReplay()),
    // El token CSRF (cookie XSRF-TOKEN → cabecera X-XSRF-TOKEN) lo gestiona HttpClient por defecto.
    provideHttpClient(withFetch(), withInterceptors([apiOriginInterceptor])),
    // Etiquetas de SEO en cada navegación (también en el servidor).
    provideAppInitializer(() => {
      inject(Seo);
    }),
  ],
};
