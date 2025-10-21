// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guards';

export const routes: Routes = [
  // Home por defecto
  { path: '', pathMatch: 'full', redirectTo: 'bienvenida' },

  // Público
  {
    path: 'bienvenida',
    loadComponent: () =>
      import('./features/auth/pages/bienvenida/bienvenida').then(m => m.Bienvenida),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login').then(m => m.Login),
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./features/auth/pages/register/register').then(m => m.RegisterComponent),
  },

  // Perfil (requiere estar logueado)
  {
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/perfil/perfil.component').then(m => m.PerfilComponent),
  },

  // Cliente (logueado)
  {
    path: 'cliente',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/pages/pagina-principal-cliente/pagina-principal-cliente')
        .then(m => m.PaginaPrincipalCliente),
  },

  // Entrenador (logueado + rol)
  {
    path: 'entrenador',
    canActivate: [authGuard, roleGuard('entrenador')],
    loadComponent: () =>
      import('./features/auth/pages/pagina-principal-entrenador/pagina-principal-entrenador')
        .then(m => m.PaginaPrincipalEntrenador),
  },

  // (Opcional) si tu sidebar apunta a /inicio y no tienes componente, redirige a cliente:
  // { path: 'inicio', redirectTo: 'cliente', pathMatch: 'full' },

  // Comodín SIEMPRE al final
  { path: '**', redirectTo: 'login' },
];
