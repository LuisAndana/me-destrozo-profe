// src/app/core/guards/auth.guard.ts
// VERSIÓN MEJORADA: Con restauración de sesión y mejor validación

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

const TOKEN_KEYS = ['gym_token', 'token'];      // compat
const USER_KEYS  = ['gym_user',  'usuario'];    // compat

const norm = (s?: string) => (s ?? '').toLowerCase().trim();

/**
 * Canoniza a 'cliente' | 'entrenador'
 */
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

/**
 * 🔑 Lee token desde localStorage con fallback robusto
 * ✅ MEJORADO: Validación más estricta (mínimo 10 caracteres)
 */
function readToken(): string {
  for (const k of TOKEN_KEYS) {
    const v = (localStorage.getItem(k) || '').trim();
    // Token válido debe tener mínimo ~40 caracteres (JWT)
    if (v && v.length > 10) {
      console.log(`[Guard] ✅ Token encontrado en ${k}`);
      return v;
    }
  }
  console.log('[Guard] ⚠️ No se encontró token válido');
  return '';
}

/**
 * 👤 Lee usuario desde localStorage con fallback robusto
 */
function readUser(): any {
  for (const k of USER_KEYS) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const user = JSON.parse(raw);
        if (user?.id_usuario || user?.id) {
          console.log(`[Guard] ✅ Usuario encontrado en ${k}:`, user.email);
          return user;
        }
      }
    } catch (e) {
      console.warn(`[Guard] ⚠️ Error parseando ${k}:`, e);
    }
  }
  console.log('[Guard] ⚠️ No se encontró usuario válido');
  return null;
}

/**
 * 🔐 Verifica si hay sesión válida (token + usuario)
 */
function hasValidSession(): boolean {
  const token = readToken();
  const user = readUser();
  const isValid = !!(token && user && (user.id_usuario || user.id));
  
  console.log('[Guard] Sesión válida:', isValid, { token: !!token, user: !!user });
  return isValid;
}

/**
 * 🔄 Restaura sesión desde localStorage
 * Se ejecuta cuando se detecta que hay datos guardados
 */
function restoreSession(): void {
  const authService = inject(AuthService);
  const token = readToken();
  const user = readUser();
  
  if (token && user) {
    console.log('[Guard] 🔄 Restaurando sesión desde localStorage...');
    authService.setUser(user);
    console.log('[Guard] ✅ Sesión restaurada');
  }
}

/**
 * 📍 Auth Guard: Protege rutas requiriendo autenticación
 * ✅ MEJORADO: Intenta restaurar sesión antes de rechazar
 */
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  console.log(`[Auth Guard] 🔐 Verificando acceso a: ${state.url}`);

  // 1️⃣ Verificar si hay sesión válida
  if (hasValidSession()) {
    console.log('[Auth Guard] ✅ Sesión válida, permitiendo acceso');
    restoreSession();
    return true;
  }

  // 2️⃣ Si no hay sesión, verificar si hay datos guardados
  const token = readToken();
  const user = readUser();
  
  if (token && user) {
    console.log('[Auth Guard] 🔄 Restaurando sesión desde datos guardados...');
    restoreSession();
    return true;
  }

  // 3️⃣ Sin sesión válida, redirigir al login
  console.log('[Auth Guard] ❌ Sin sesión válida, redirigiendo a login');
  return router.createUrlTree(['/login'], { queryParams: { r: state.url } });
};

/**
 * 👥 Role Guard: Verifica que el usuario tenga el rol requerido
 * ✅ MEJORADO: Mejor manejo de redirecciones por rol
 */
export const roleGuard = (expectedRole: string): CanActivateFn => {
  return (route, state) => {
    const router = inject(Router);
    
    console.log(`[Role Guard] 👥 Verificando rol para: ${state.url}`);
    console.log(`[Role Guard] Rol esperado: ${expectedRole}`);

    // 1️⃣ Si no hay sesión, ir al login
    if (!hasValidSession()) {
      console.log('[Role Guard] ❌ Sin sesión, redirigiendo a login');
      return router.createUrlTree(['/login'], { queryParams: { r: state.url } });
    }

    // 2️⃣ Obtener rol del usuario
    const usuario = readUser();
    const rolActual = normalizeRole(usuario?.rol);
    const rolEsperado = normalizeRole(expectedRole);

    console.log(`[Role Guard] Rol actual: ${rolActual}, Rol esperado: ${rolEsperado}`);

    // 3️⃣ Verificar que roles coincidan
    if (rolActual && rolEsperado && rolActual === rolEsperado) {
      console.log('[Role Guard] ✅ Rol válido, permitiendo acceso');
      restoreSession();
      return true;
    }

    // 4️⃣ Rol no coincide, redirigir según tipo de usuario
    console.log('[Role Guard] ⚠️ Rol no coincide, redirigiendo...');
    
    if (rolActual === 'entrenador') {
      console.log('[Role Guard] → Redirigiendo a página de entrenador');
      return router.createUrlTree(['/pagina-principal-entrenador']);
    }
    
    if (rolActual === 'cliente') {
      console.log('[Role Guard] → Redirigiendo a página de cliente');
      return router.createUrlTree(['/cliente']);
    }

    // Fallback: volver al login
    console.log('[Role Guard] → Fallback: redirigiendo a login');
    return router.createUrlTree(['/login'], { queryParams: { r: state.url } });
  };
};

/**
 * 🆔 Perfil Role Guard: Guard específico para ruta '/perfil'
 * - Si CLIENTE: permite acceso a /perfil
 * - Si ENTRENADOR: redirige a /entrenador/perfil
 * ✅ MEJORADO: Con mejor logging y restauración de sesión
 */
export const perfilRoleGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  console.log(`[Perfil Guard] 🆔 Verificando acceso a perfil`);

  // 1️⃣ Requiere autenticación
  if (!hasValidSession()) {
    console.log('[Perfil Guard] ❌ Sin sesión, redirigiendo a login');
    return router.createUrlTree(['/login'], { queryParams: { r: state.url } });
  }

  // 2️⃣ Restaurar sesión si hay datos
  restoreSession();

  // 3️⃣ Obtener rol del usuario
  const usuario = readUser();
  const rol = normalizeRole(usuario?.rol);

  console.log(`[Perfil Guard] Rol detectado: ${rol}`);

  // 4️⃣ Si es entrenador, redirigir a su perfil
  if (rol === 'entrenador') {
    console.log('[Perfil Guard] → Entrenador detectado, redirigiendo a /entrenador/perfil');
    return router.createUrlTree(['/entrenador/perfil']);
  }

  // 5️⃣ Si es cliente, permitir acceso a /perfil
  if (rol === 'cliente') {
    console.log('[Perfil Guard] ✅ Cliente, permitiendo acceso a /perfil');
    return true;
  }

  // 6️⃣ Fallback: rol desconocido, volver al login
  console.log('[Perfil Guard] ⚠️ Rol desconocido, redirigiendo a login');
  return router.createUrlTree(['/login'], { queryParams: { r: state.url } });
};

/**
 * 🔓 Public Guard: Para rutas públicas (login, register)
 * - Si NO estás autenticado: permite acceso
 * - Si estás autenticado: redirige a home/dashboard
 */
export const publicGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  console.log(`[Public Guard] 🔓 Verificando acceso a ruta pública: ${state.url}`);

  // Si hay sesión válida, redirigir a home
  if (hasValidSession()) {
    console.log('[Public Guard] ℹ️ Ya autenticado, redirigiendo a /home');
    return router.createUrlTree(['/']);
  }

  // Si no hay sesión, permitir acceso a ruta pública
  console.log('[Public Guard] ✅ Permitiendo acceso a ruta pública');
  return true;
};