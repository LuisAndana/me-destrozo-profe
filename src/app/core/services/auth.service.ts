// src/app/core/services/auth.service.ts
// VERSIÓN MEJORADA CON FIX: Manejo seguro de id_usuario

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, switchMap, tap, Observable, of, throwError } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

type LoginBody = { email: string; password: string };

type LoginApiResp = {
  ok: boolean;
  mensaje: string;
  token: string;
  usuario: { id: number; nombre: string; apellido: string; email: string; rol: string; };
};

export type Usuario = {
  id_usuario: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: 'entrenador' | 'alumno';
};

const TOKEN_KEY = 'gym_token';
const LEGACY_TOKEN_KEY = 'token';
const USER_KEY = 'gym_user';
const TOKEN_EXPIRY_KEY = 'gym_token_expiry';

const EXTERNAL_AUTH_KEYS = ['firebaseUser','googleUser','g_token','authUser','oauth_user'];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _user$ = new BehaviorSubject<Usuario | null>(this.restoreUser());
  user$ = this._user$.asObservable();
  get user() { return this._user$.value; }

  private _isAuthenticated$ = new BehaviorSubject<boolean>(this.isAuthenticatedCheck());
  isAuthenticated$ = this._isAuthenticated$.asObservable().pipe(
    debounceTime(100),
    distinctUntilChanged()
  );

  constructor() {
    console.log('🔗 AuthService inicializado');
    console.log('🌍 API Base URL:', environment.apiBase);
    
    // Restaurar sesión al iniciar
    this.restoreSession();
    
    // Monitorear cambios de autenticación
    this._user$.subscribe(user => {
      this._isAuthenticated$.next(!!user && !!this.getToken());
    });
  }

  /**
   * 🔄 Restaura la sesión desde localStorage
   * Se ejecuta al cargar la app
   */
  private restoreSession(): void {
    const token = this.getToken();
    const user = this.restoreUser();
    
    console.log('🔄 Restaurando sesión...');
    console.log('  Token disponible:', !!token);
    console.log('  Usuario disponible:', !!user);
    
    if (token && user) {
      console.log('✅ Sesión restaurada correctamente');
      this._user$.next(user);
      this._isAuthenticated$.next(true);
    } else if (token && !user) {
      console.log('⚠️ Token existe pero no hay usuario, intentando fetchMe()...');
    } else {
      console.log('❌ Sin sesión válida');
      this.wipeAll();
    }
  }

  /**
   * ✅ Verifica si está autenticado
   */
  private isAuthenticatedCheck(): boolean {
    const token = this.getToken();
    const user = this.restoreUser();
    return !!(token && user);
  }

  get isAuthenticated() { 
    return this.isAuthenticatedCheck();
  }

  private wipeExternalAuthArtifacts() {
    EXTERNAL_AUTH_KEYS.forEach(k => localStorage.removeItem(k));
  }

  private wipeAll() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('id_entrenador');
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    this._user$.next(null);
    this._isAuthenticated$.next(false);
    this.wipeExternalAuthArtifacts();
  }

  private normalizeUser(raw: any): Usuario | null {
    if (!raw) return null;
    const id = Number(raw.id_usuario ?? raw.id ?? raw.uid ?? NaN);
    const nombre = raw.nombre ?? raw.displayName ?? '';
    const apellido = raw.apellido ?? raw.apellidos ?? '';
    const email = raw.email ?? raw.correo ?? '';
    const rol = this.mapRolApiToUi(raw.rol);
    if (!Number.isFinite(id) || !email) return null;
    return { id_usuario: id, nombre, apellido, email, rol };
  }

  private restoreUser(): Usuario | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return this.normalizeUser(raw ? JSON.parse(raw) : null);
    } catch { 
      console.error('❌ Error restaurando usuario');
      return null;
    }
  }

  private mapRolApiToUi(rolApi?: string): 'alumno' | 'entrenador' {
    const r = (rolApi || '').toLowerCase();
    if (r === 'cliente' || r === 'alumno') return 'alumno';
    if (r === 'entrenador' || r === 'trainer') return 'entrenador';
    return 'alumno';
  }

  /**
   * 💾 Guarda usuario en localStorage - CON VALIDACIÓN SEGURA
   * ✅ MEJORADO: Manejo seguro de id_usuario
   */
  public setUser(u: Usuario | null) {
    if (u) {
      // Validar que tenga ID válido
      const id = u.id_usuario || (u as any).id;
      if (!id || !Number.isFinite(id)) {
        console.error('❌ Usuario sin ID válido, no se guardará');
        return;
      }

      localStorage.setItem('gym_user', JSON.stringify(u));
      localStorage.setItem('id_entrenador', String(id));
      console.log('💾 Usuario guardado:', u.email, 'ID:', id);
    } else {
      localStorage.removeItem('gym_user');
      localStorage.removeItem('id_entrenador');
      console.log('🗑️ Usuario eliminado');
    }
    this._user$.next(u);
  }

  /**
   * 💾 Guarda el token en localStorage
   * ⚠️ CRÍTICO: Se ejecuta ANTES de hacer setUser()
   */
  private saveToken(token: string) {
    const t = (token || '').trim();
    if (t && t.length > 10) {
      localStorage.setItem(TOKEN_KEY, t);
      
      // Guardar fecha de expiración (7 días)
      const expiryTime = new Date().getTime() + (7 * 24 * 60 * 60 * 1000);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
      
      console.log('✅ Token guardado:', t.substring(0, 20) + '...');
      return true;
    } else {
      console.warn('⚠️ Token vacío o inválido, no se guardó');
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      return false;
    }
  }

  /**
   * 🔑 Obtiene el token
   * Intenta múltiples fuentes (fallback robusto)
   */
  getToken(): string | null {
    // 1. Intentar de localStorage principal
    let token = localStorage.getItem(TOKEN_KEY);
    if (token && token.trim().length > 10) {
      return token.trim();
    }

    // 2. Fallback a token legado
    token = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (token && token.trim().length > 10) {
      return token.trim();
    }

    // 3. Fallback a gym_user.token
    try {
      const userStr = localStorage.getItem(USER_KEY);
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.token && typeof user.token === 'string' && user.token.length > 10) {
          return user.token.trim();
        }
      }
    } catch {
      // no-op
    }

    return null;
  }

  /**
   * ✅ Verifica si el token está expirado
   */
  private isTokenExpired(): boolean {
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryStr) return false;
    
    try {
      const expiry = parseInt(expiryStr, 10);
      const now = new Date().getTime();
      const isExpired = now > expiry;
      
      if (isExpired) {
        console.warn('⏰ Token expirado');
      }
      
      return isExpired;
    } catch {
      return false;
    }
  }

  // ---------- API CALLS ----------
  
  /**
   * 🔐 Login con email y contraseña
   */
  login(body: LoginBody): Observable<Usuario> {
    const url = environment.apiBase + environment.endpoints.login;
    console.log('📤 POST Login:', url);
    
    return this.http.post<LoginApiResp>(url, body).pipe(
      tap(res => {
        console.log('✅ Login API response:', res);
        
        // 1. Validar respuesta
        if (!res || !res.token) {
          throw new Error('Token no recibido en respuesta de login');
        }
        
        // 2. GUARDAR TOKEN PRIMERO (crítico)
        if (!this.saveToken(res.token)) {
          throw new Error('No se pudo guardar token');
        }
        
        // 3. Limpiar artefactos externos
        this.wipeExternalAuthArtifacts();
      }),
      switchMap(() => {
        // 4. Obtener usuario completo
        return this.fetchMe().pipe(
          catchError(err => {
            console.warn('⚠️ fetchMe falló, continuando...');
            // Retornar usuario dummy si fetchMe falla
            return of({
              id_usuario: 0,
              nombre: 'Usuario',
              apellido: '',
              email: body.email,
              rol: 'alumno'
            } as Usuario);
          })
        );
      }),
      tap((usuario) => {
        console.log('✅ Login completado:', usuario.email);
        this._isAuthenticated$.next(true);
      }),
      catchError(err => {
        console.error('❌ Login falló:', err);
        this.wipeAll();
        return throwError(() => err);
      })
    );
  }

  /**
   * 🔑 Google Sign In
   */
  googleSignin(credential: string, rol: string): Observable<Usuario> {
    const url = environment.apiBase + environment.endpoints.googleSignin;
    console.log('📤 POST Google Signin:', url);
    
    return this.http.post<LoginApiResp>(url, { credential, rol }).pipe(
      tap(res => {
        console.log('✅ Google Signin response:', res);
        
        if (!res || !res.token) {
          throw new Error('Token no recibido en respuesta de google signin');
        }
        
        // GUARDAR TOKEN PRIMERO
        if (!this.saveToken(res.token)) {
          throw new Error('No se pudo guardar token');
        }
        
        this.wipeExternalAuthArtifacts();
      }),
      switchMap(() => 
        this.fetchMe().pipe(
          catchError(err => {
            console.warn('⚠️ fetchMe falló en googleSignin');
            return of({
              id_usuario: 0,
              nombre: 'Usuario Google',
              apellido: '',
              email: '',
              rol: 'alumno'
            } as Usuario);
          })
        )
      ),
      tap((usuario) => {
        console.log('✅ Google Signin completado');
        this._isAuthenticated$.next(true);
      }),
      catchError(err => {
        console.error('❌ Google Signin falló:', err);
        this.wipeAll();
        return throwError(() => err);
      })
    );
  }

  /**
   * 📝 Registrar nuevo usuario
   */
  register(data: Partial<Usuario> & { password: string }): Observable<Usuario> {
    const url = environment.apiBase + environment.endpoints.register;
    console.log('📤 POST Register:', url);
    
    const payload = {
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      password: data.password,
      rol: data.rol
    };
    
    return this.http.post<any>(url, payload).pipe(
      tap(res => console.log('✅ Register response:', res)),
      switchMap(() => this.login({ email: data.email!, password: data.password })),
      catchError(err => {
        console.error('❌ Register falló:', err);
        this.wipeAll();
        return throwError(() => err);
      })
    );
  }

  /**
   * 👤 Obtener usuario actual desde el backend
   */
  fetchMe(): Observable<Usuario> {
    const url = environment.apiBase + environment.endpoints.me;
    const token = this.getToken();

    console.log('📤 GET Me:', url);

    if (!token) {
      console.warn('❌ No hay token para fetchMe()');
      this.wipeAll();
      return throwError(() => new Error('No token available'));
    }

    const headers = { 'Authorization': `Bearer ${token}` };

    return this.http.get<any>(url, { headers }).pipe(
      tap(res => {
        console.log('✅ Me response:', res);
      }),
      map((resp) => {
        const r = resp?.usuario ?? resp;
        const normalized = this.normalizeUser({
          id: r.id ?? r.id_usuario,
          nombre: r.nombre,
          apellido: r.apellido,
          email: r.email,
          rol: r.rol,
        });
        
        if (!normalized) {
          throw new Error('No se pudo normalizar usuario');
        }
        
        return normalized;
      }),
      tap((u) => {
        console.log('✅ Usuario normalizado:', u.email);
        this.setUser(u);
        this._isAuthenticated$.next(true);
      }),
      catchError(err => {
        console.error('❌ fetchMe falló:', err);
        // NO hacer logout aquí, dejar que el interceptor maneje 401
        return throwError(() => err);
      })
    );
  }

  /**
   * 📝 Actualiza usuario local sin fetchMe
   */
  public patchLocalUser(patch: Partial<Usuario>): void {
    const current = this.user;
    if (!current) return;

    const merged: Usuario = { ...current, ...patch } as Usuario;
    localStorage.setItem('gym_user', JSON.stringify(merged));
    this._user$.next(merged);
    console.log('📝 Usuario local actualizado:', merged);
  }

  /**
   * 🚪 Logout - limpia token y usuario
   */
  logout(): void {
    console.log('🚪 Ejecutando logout...');
    this.wipeAll();
    this.router.navigate(['/login']);
    console.log('✅ Logout completado');
  }

  /**
   * 🔐 Fuerza que vuelva a obtener el usuario actual
   */
  refreshUser(): Observable<Usuario> {
    console.log('🔄 Refrescando usuario...');
    return this.fetchMe();
  }
}