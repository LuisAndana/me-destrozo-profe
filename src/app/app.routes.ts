import { Routes } from '@angular/router';
import { authGuard, roleGuard, perfilRoleGuard } from './core/guards/auth.guards';

export const routes: Routes = [
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

  // Perfil genérico
  {
    path: 'perfil',
    canActivate: [authGuard, perfilRoleGuard],
    loadComponent: () =>
      import('./pages/perfil/perfil.component').then(m => m.PerfilComponent),
  },

  // Cliente
  {
    path: 'cliente',
    canActivate: [authGuard, roleGuard('cliente')],
    loadComponent: () =>
      import('./features/auth/pages/pagina-principal-cliente/pagina-principal-cliente')
        .then(m => m.PaginaPrincipalCliente),
  },

  // Rutina
  {
    path: 'rutina',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/pages/rutina/rutina.component').then(m => m.RutinaComponent),
  },

  // ================== ENTRENADOR ==================
  {
    path: 'entrenador',
    canActivate: [authGuard, roleGuard('entrenador')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/auth/pages/pagina-principal-entrenador/pagina-principal-entrenador')
            .then(m => m.PaginaPrincipalEntrenador),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/auth/pages/perfil-entrenador/perfil-entrenador')
            .then(m => m.PerfilEntrenadorPage),
      },
    ],
  },

  // Alias legacy
  { path: 'pagina-principal-entrenador', pathMatch: 'full', redirectTo: 'entrenador/home' },

  // ================== ENTRENADORES (listado + detalle) ==================
  {
  path: 'entrenadores',
  loadComponent: () =>
    import('./features/auth/pages/entrenadores/entrenadores.page')
      .then(m => m.EntrenadoresPage),
},
{
  path: 'entrenadores/:id',
  loadComponent: () =>
    import('./features/auth/pages/entrenadores/detalle-entrenador.page')
      .then(m => m.DetalleEntrenadorPage),
},

  // Comodín
  { path: '**', redirectTo: 'login' },
];
