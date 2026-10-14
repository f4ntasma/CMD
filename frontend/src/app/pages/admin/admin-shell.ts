import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container admin-layout">
      <nav class="admin-nav" aria-label="Panel de administración">
        <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Resumen</a>
        <a routerLink="/admin/cursos" routerLinkActive="active">Cursos</a>
        <a routerLink="/admin/categorias" routerLinkActive="active">Categorías</a>
        <a routerLink="/admin/rutas" routerLinkActive="active">Rutas</a>
        <a routerLink="/admin/publicaciones" routerLinkActive="active">Blog y noticias</a>
        <a routerLink="/admin/ordenes" routerLinkActive="active">Pagos</a>
        <a routerLink="/admin/comentarios" routerLinkActive="active">Comentarios</a>
        <a routerLink="/admin/usuarios" routerLinkActive="active">Usuarios</a>
        <a routerLink="/admin/ajustes" routerLinkActive="active">Ajustes del sitio</a>
      </nav>
      <section><router-outlet /></section>
    </div>
  `,
})
export class AdminShell {}
