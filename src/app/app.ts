import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { filter } from 'rxjs/operators';

import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { HeaderMenuComponent } from './core/layout/app-header/header-menu/header-menu.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    HttpClientModule,
    HeaderMenuComponent,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  private router = inject(Router);
  protected readonly title = signal('me-destrozo-profe');

  /** Rutas sin layout (login/registro/bienvenida/verify-email) */
  private readonly authRegex = /^\/(login|registro|register|bienvenida|verify-email)(\/)?$/i;

  /** Rutas donde NO queremos "recentrado" al abrir el menú */
  private readonly noRecenterRegex =
    /^\/((entrenadores)(\/[\w-]+)?|(entrenador)(\/[\w-]+)?)\/?$/i; // plural y singular

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => this.applyBodyClasses(e.urlAfterRedirects || e.url || ''));

    // Estado inicial
    this.applyBodyClasses(this.router.url || '');
  }

  private applyBodyClasses(url: string) {
    const isAuth = this.authRegex.test(url);
    const noRecenter = this.noRecenterRegex.test(url);

    document.body.classList.toggle('layout-auth', isAuth);
    document.body.classList.toggle('layout-default', !isAuth);

    // 👇 Si estamos en lista/detalle de entrenadores, desactiva el "recentrado"
    document.body.classList.toggle('no-recenter', noRecenter);
  }

  headerMenuVisible(): boolean {
    const url = this.router.url || '';
    return !this.authRegex.test(url);
  }
}