import { Routes } from '@angular/router';
import { authGuard, roleGuard, perfilRoleGuard } from './core/guards/auth.guards';

export const routes: Routes = [

  { path: '', pathMatch: 'full', redirectTo: 'bienvenida' },

  // ================== PÚBLICO ==================
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

  // ================== PERFIL GENERAL ==================
  {
    path: 'perfil',
    canActivate: [authGuard, perfilRoleGuard],
    loadComponent: () =>
      import('./pages/perfil/perfil.component').then(m => m.PerfilComponent),
  },

  // ================== CLIENTE ==================
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

      {
        path: 'mis-clientes',
        loadComponent: () =>
          import('./components/mis-clientes/mis-clientes.component')
            .then(m => m.MisClientesComponent),
      },

      {
        path: 'generar-rutina/:id',
        loadComponent: () =>
          import('./components/mis-clientes/generar-rutina/generar-rutina.component')
            .then(m => m.GenerarRutinaComponent),
      },

      // ⭐⭐⭐ RUTA CORRECTA PARA RESEÑAS DEL ENTRENADOR
      {
        path: 'resenas',
        loadComponent: () =>
          import('./features/auth/pages/resenas/resenas-entrenador/resenas-entrenador.component')
            .then(m => m.ResenasEntrenadorComponent),
      },
    ],
  },

  // Alias legacy
  { path: 'pagina-principal-entrenador', pathMatch: 'full', redirectTo: 'entrenador/home' },

  // ================== ENTRENADORES (LISTA / DETALLE) ==================
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

  // ================== PAGO ==================
  {
    path: 'pago/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/perfil/proceso-pago/proceso-pago.page')
        .then(m => m.ProcesoPagoPage),
  },

  // ================== PROGRESIÓN CLIENTE ==================
  {
    path: 'progresion-cliente/:id',
    loadComponent: () =>
      import('./features/auth/pages/progreso_cliente/progreso_cliente.component')
        .then(m => m.ProgresoClienteComponent),
  },

  // ================== MENSAJES ==================
  {
    path: 'mensajes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/pages/mensajes/conversaciones/conversaciones.component')
        .then(m => m.ConversacionesComponent),
  },

  {
    path: 'mensajes/chat/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/pages/mensajes/chat/chat.component')
        .then(m => m.ChatComponent),
  },

  {
    path: 'mensajes/nueva',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/pages/mensajes/nueva-conversacion/nueva-conversacion')
        .then(m => m.NuevaConversacionComponent),
  },

  // ================== WILDCARD ==================
  { path: '**', redirectTo: 'login' },
];
