import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';

/**
 * Origen de la API. Vacío en el navegador (mismo dominio); en el render del servidor apunta al backend
 * por la red interna.
 */
export const API_ORIGIN = new InjectionToken<string>('API_ORIGIN', { factory: () => '' });

export const apiOriginInterceptor: HttpInterceptorFn = (request, next) => {
  const origin = inject(API_ORIGIN);
  return next(origin && request.url.startsWith('/api/') ? request.clone({ url: origin + request.url }) : request);
};

/** Mensaje para mostrar al usuario a partir de un error de la API (formato ProblemDetail). */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Revisa tu conexión.';
    }
    const body = error.error as { detail?: string; errors?: Record<string, string> } | null;
    if (body?.errors && Object.keys(body.errors).length > 0) {
      return Object.entries(body.errors)
        .map(([field, message]) => `${FIELD_LABELS[field] ?? field}: ${message}`)
        .join(' · ');
    }
    if (body?.detail) {
      return body.detail;
    }
    if (error.status === 401) {
      return 'Inicia sesión para continuar.';
    }
    if (error.status === 403) {
      return 'No tienes permiso para hacer esto.';
    }
  }
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}

const FIELD_LABELS: Record<string, string> = {
  email: 'Correo',
  password: 'Contraseña',
  newPassword: 'Nueva contraseña',
  displayName: 'Nombre',
  title: 'Título',
  summary: 'Resumen',
  slug: 'Dirección',
  coverUrl: 'Portada',
  avatarUrl: 'Avatar',
  price: 'Precio',
  paymentReference: 'N.º de operación',
  body: 'Comentario',
  excerpt: 'Extracto',
  color: 'Color',
  name: 'Nombre',
};
