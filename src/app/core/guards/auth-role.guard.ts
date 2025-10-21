// src/app/core/guards/auth-role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

const norm = (s?: string) => (s ?? '').toLowerCase().trim();

export const authRoleGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  const token = (localStorage.getItem('token') || '').trim();
  if (!token) {
    return router.createUrlTree(['/login'], { queryParams: { r: state.url } });
  }

  const allowed = ((route.data?.['roles'] as string[]) || []).map(norm);
  if (allowed.length === 0) return true;

  let rol = '';
  try {
    const u = JSON.parse(localStorage.getItem('usuario') || 'null');
    rol = norm(u?.rol);
  } catch {}

  if (allowed.includes(rol)) return true;

  // Rol inválido → manda a home por rol si existe, si no a bienvenida
  if (rol === 'entrenador') return router.createUrlTree(['/entrenador']);
  if (rol === 'cliente')    return router.createUrlTree(['/cliente']);
  return router.createUrlTree(['/bienvenida']);
};
