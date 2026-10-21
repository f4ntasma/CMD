import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/** Dominio público: con él se arman las URL canónicas y las de las vistas previas al compartir. */
export const SITE_URL = 'https://coffemokeydevs.site';
export const SITE_NAME = "Monkey Coffe Dev's";
export const DEFAULT_DESCRIPTION =
  'Academia en línea en español: aprende programación, POO, bases de datos, ciberseguridad e inteligencia artificial ' +
  'con cursos prácticos, cuestionarios y certificado verificable.';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

export interface SeoData {
  title?: string;
  description?: string | null;
  image?: string | null;
  type?: 'website' | 'article';
  /** Datos estructurados (schema.org) para los resultados enriquecidos de Google. */
  jsonLd?: object | null;
}

/** Datos de SEO declarados en una ruta (`data: { seo: {...} }`). */
export interface RouteSeo {
  description?: string;
  /** Páginas privadas o de formularios: que Google no las indexe. */
  noindex?: boolean;
  jsonLd?: object;
}

/**
 * Mantiene las etiquetas de SEO en sincronía con la ruta. Corre también en el servidor (SSR), así que los
 * buscadores y las vistas previas de redes reciben el HTML con todo ya puesto.
 */
@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => this.applyRoute());
  }

  /** Valores por defecto de la ruta actual; las páginas de detalle los afinan después con `update`. */
  private applyRoute(): void {
    let route: ActivatedRouteSnapshot = this.router.routerState.snapshot.root;
    let seo: RouteSeo = {};
    let title = SITE_NAME;
    while (route) {
      seo = { ...seo, ...(route.data['seo'] as RouteSeo | undefined) };
      title = route.title ?? title;
      route = route.firstChild!;
    }
    this.meta.updateTag({ name: 'robots', content: seo.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large' });
    this.update({ title, description: seo.description ?? DEFAULT_DESCRIPTION, type: 'website', jsonLd: seo.jsonLd ?? null });
  }

  update(data: SeoData): void {
    const path = this.router.url.split(/[?#]/)[0];
    const url = SITE_URL + (path === '/' ? '/' : path);
    const title = data.title ?? this.document.title;
    const description = (data.description || DEFAULT_DESCRIPTION).replace(/\s+/g, ' ').trim().slice(0, 300);
    const image = data.image || DEFAULT_IMAGE;

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:locale', content: 'es_PE' });
    this.meta.updateTag({ property: 'og:type', content: data.type ?? 'website' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
    this.setCanonical(url);
    this.setJsonLd(data.jsonLd ?? null);
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setJsonLd(data: object | null): void {
    this.document.head.querySelector('script[data-seo="page"]')?.remove();
    if (data) {
      const script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-seo', 'page');
      // Se escapa "<" para que ningún texto del contenido pueda cerrar la etiqueta <script>.
      script.textContent = JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(/</g, '\\u003c');
      this.document.head.appendChild(script);
    }
  }
}

/** La academia como organización educativa: aparece en la portada. */
export const ORGANIZATION_JSON_LD = {
  '@type': 'EducationalOrganization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: DEFAULT_DESCRIPTION,
  inLanguage: 'es',
};
