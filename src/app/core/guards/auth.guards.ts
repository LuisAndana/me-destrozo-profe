// src/app/core/guards/auth.guards.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

const TOKEN_KEYS = ['gym_token', 'token'];      // compat
const USER_KEYS  = ['gym_user',  'usuario'];    // compat

const norm = (s?: string) => (s ?? '').toLowerCase().trim();

// Canoniza a 'cliente' | 'entrenador'
function normalizeRole(raw?: string): 'cliente' | 'entrenador' | '' {
  const r = norm(raw);
  if (!r) return '';
  const map: Record<string, 'cliente' | 'entrenador'> = {
    alumno: 'cliente',
    empleado: 'cliente',
    user: 'cliente',
    cliente: 'cliente',
    coach: 'entrenador',
    trainer: 'entrenador',
    entrenador: 'entrenador',
  };
  return (map[r] ?? (r as any));
}

function readToken(): string {
  for (const k of TOKEN_KEYS) {
    const v = (localStorage.getItem(k) || '').trim();
    if (v) return v;
  }
  return '';
}

function readUser(): any {
  for (const k of USER_KEYS) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return null;
}

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = readToken();

  if (token) return true;

  return router.createUrlTree(['/login'], { queryParams: { r: state.url } });
};

export const roleGuard = (expectedRole: string): CanActivateFn => {
  return (route, state) => {
    const router = inject(Router);

    // Si no hay token, primero fuerza login
    if (!readToken()) {
      return router.createUrlTree(['/login'], { queryParams: { r: state.url } });
    }

    const usuario  = readUser();
    const rol      = normalizeRole(usuario?.rol);
    const expected = normalizeRole(expectedRole);

    if (rol && expected && rol === expected) return true;

    // Redirige a home por rol si se conoce; si no, a /login
    if (rol === 'entrenador') return router.createUrlTree(['/entrenador']);
    if (rol === 'cliente')    return router.createUrlTree(['/cliente']);
    return router.createUrlTree(['/login'], { queryParams: { r: state.url } });
  };
};
