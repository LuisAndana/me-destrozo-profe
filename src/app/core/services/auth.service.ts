import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, switchMap, tap, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';

type LoginBody = { email: string; password: string };

type LoginApiResp = {
  ok: boolean;
  mensaje: string;
  token: string;
  usuario: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    rol: string; // "cliente" | "alumno" | "entrenador"
  };
};

export type Usuario = {
  id_usuario: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: 'entrenador' | 'alumno';
};

const TOKEN_KEY = 'gym_token';
const LEGACY_TOKEN_KEY = 'token'; // compat
const USER_KEY = 'gym_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private _user$ = new BehaviorSubject<Usuario | null>(this.restoreUser());
  user$ = this._user$.asObservable();
  get user() { return this._user$.value; }

  constructor() {
    // Migración de token legado -> nueva clave
    const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
    const current = localStorage.getItem(TOKEN_KEY);
    if (legacy && !current) {
      localStorage.setItem(TOKEN_KEY, legacy);
    }
  }

  get isAuthenticated() {
    return !!this.getToken();
  }

  // ---------- helpers ----------
  private restoreUser(): Usuario | null {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
    catch { return null; }
  }

  private mapRolApiToUi(rolApi?: string): 'alumno' | 'entrenador' {
    const r = (rolApi || '').toLowerCase();
    if (r === 'cliente' || r === 'alumno') return 'alumno';
    if (r === 'entrenador') return 'entrenador';
    // fallback razonable
    return 'alumno';
  }

  private saveToken(token: string) {
    if (token && token.trim()) localStorage.setItem(TOKEN_KEY, token.trim());
  }

  private saveUser(u: Usuario) {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    this._user$.next(u);
  }

  /** Token actual o null */
  getToken(): string | null {
    const t = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY) || '';
    return t.trim() ? t.trim() : null;
  }

  // ---------- API ----------
  login(body: LoginBody): Observable<Usuario> {
    const url = environment.apiBase + environment.endpoints.login; // p.ej. /usuarios/login
    return this.http.post<LoginApiResp>(url, body).pipe(
      tap(res => this.saveToken(res.token)),
      // refrescamos el usuario desde /usuarios/me para tener campos consistentes
      switchMap(() => this.fetchMe())
    );
  }

  register(data: Partial<Usuario> & { password: string }): Observable<Usuario> {
    const url = environment.apiBase + environment.endpoints.register; // /usuarios o /usuarios/register
    const payload = {
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      password: data.password,
    };
    return this.http.post<any>(url, payload).pipe(
      // encadenar login sin subscribir aquí
      switchMap(() => this.login({ email: data.email!, password: data.password }))
    );
  }

  fetchMe(): Observable<Usuario> {
    const url = environment.apiBase + environment.endpoints.me; // /usuarios/me
    const token = this.getToken();
    if (!token) {
      // sin token, no golpeamos el backend
      this.logout();
      return of(null as unknown as Usuario);
    }
    return this.http.get<any>(url).pipe(
      map((r) => {
        const u: Usuario = {
          id_usuario: r.id,
          nombre: r.nombre,
          apellido: r.apellido,
          email: r.email,
          rol: this.mapRolApiToUi(r.rol),
        };
        return u;
      }),
      tap((u) => this.saveUser(u))
    );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user$.next(null);
  }
}
