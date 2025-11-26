// src/app/core/services/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, switchMap, tap, Observable, of } from 'rxjs';
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

const EXTERNAL_AUTH_KEYS = ['firebaseUser','googleUser','g_token','authUser','oauth_user'];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private _user$ = new BehaviorSubject<Usuario | null>(this.restoreUser());
  user$ = this._user$.asObservable();
  get user() { return this._user$.value; }

  constructor() {
    console.log('🔗 AuthService usando API URL:', environment.apiBase);
    
    // Limpia tokens de sesiones antiguas o de Google
    const keysToRemove = [
      'token', 'g_token', 'authUser', 'firebaseUser', 'googleUser', 'oauth_user'
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // Asegura que no se reinyecten tokens viejos
    localStorage.removeItem('token'); // legacy
    const current = localStorage.getItem(TOKEN_KEY);
    if (!current) this.setUser(null);
  }

  get isAuthenticated() { return !!this.getToken(); }

  private wipeExternalAuthArtifacts() {
    EXTERNAL_AUTH_KEYS.forEach(k => localStorage.removeItem(k));
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
    } catch { return null; }
  }

  private mapRolApiToUi(rolApi?: string): 'alumno' | 'entrenador' {
    const r = (rolApi || '').toLowerCase();
    if (r === 'cliente' || r === 'alumno') return 'alumno';
    if (r === 'entrenador') return 'entrenador';
    return 'alumno';
  }

  public setUser(u: Usuario | null) {
    if (u) localStorage.setItem('gym_user', JSON.stringify(u));
    else localStorage.removeItem('gym_user');
    this._user$.next(u);
  }

  private saveToken(token: string) {
    const t = (token || '').trim();
    if (t) {
      localStorage.setItem(TOKEN_KEY, t);
      console.log('💾 Token guardado en localStorage');
    }
  }

  getToken(): string | null {
    const t = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY) || '';
    return t.trim() ? t.trim() : null;
  }

  // ---------- API CALLS ----------
  
  /**
   * Login con email y contraseña
   */
  login(body: LoginBody): Observable<Usuario> {
    const url = environment.apiBase + environment.endpoints.login;
    console.log('📤 POST Login:', url);
    
    return this.http.post<LoginApiResp>(url, body).pipe(
      tap(res => {
        console.log('✅ Login response recibido:', res);
        this.saveToken(res.token);
        this.wipeExternalAuthArtifacts();
      }),
      switchMap(() => this.fetchMe())
    );
  }

  /**
   * Google Sign In
   */
  googleSignin(credential: string, rol: string): Observable<Usuario> {
    const url = environment.apiBase + environment.endpoints.googleSignin;
    console.log('📤 POST Google Signin:', url);
    
    return this.http.post<LoginApiResp>(url, { credential, rol }).pipe(
      tap(res => {
        console.log('✅ Google Signin response recibido:', res);
        this.saveToken(res.token);
        this.wipeExternalAuthArtifacts();
      }),
      switchMap(() => this.fetchMe())
    );
  }

  /**
   * Registrar nuevo usuario
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
      tap(res => console.log('✅ Register response recibido:', res)),
      switchMap(() => this.login({ email: data.email!, password: data.password }))
    );
  }

  /**
   * Obtener usuario actual desde el backend
   */
  fetchMe(): Observable<Usuario> {
    const url = environment.apiBase + environment.endpoints.me;
    const token = this.getToken();

    console.log('📤 GET Me:', url);

    if (!token) {
      console.warn('[AuthService] No hay token, cerrando sesión.');
      this.logout();
      return of(null as unknown as Usuario);
    }

    const headers = { Authorization: `Bearer ${token}` };

    return this.http.get<any>(url, { headers }).pipe(
      tap(res => console.log('✅ Me response recibido:', res)),
      map((resp) => {
        const r = resp?.usuario ?? resp;
        return this.normalizeUser({
          id: r.id ?? r.id_usuario,
          nombre: r.nombre,
          apellido: r.apellido,
          email: r.email,
          rol: r.rol,
        }) as Usuario;
      }),
      tap((u) => {
        if (u) {
          console.log('✅ Usuario normalizado y guardado:', u);
          this.setUser(u);
        }
      })
    );
  }

  /**
   * Actualiza parcialmente nombre/email locales sin disparar lógica de setUser.
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
   * Logout - elimina token y usuario
   */
  logout() {
    console.log('🚪 Ejecutando logout...');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    this.setUser(null);
    this.wipeExternalAuthArtifacts();
    console.log('✅ Logout completado');
  }
}