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
    const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
    const current = localStorage.getItem(TOKEN_KEY);
    if (legacy && !current) localStorage.setItem(TOKEN_KEY, legacy);
    if (!this.getToken() && this._user$.value) this.setUser(null);
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
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
    this._user$.next(u);
  }

  private saveToken(token: string) {
    const t = (token || '').trim();
    if (t) localStorage.setItem(TOKEN_KEY, t);
  }

  getToken(): string | null {
    const t = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY) || '';
    return t.trim() ? t.trim() : null;
  }

  login(body: LoginBody): Observable<Usuario> {
    const url = environment.apiBase + environment.endpoints.login;
    return this.http.post<LoginApiResp>(url, body).pipe(
      tap(res => { this.saveToken(res.token); this.wipeExternalAuthArtifacts(); }),
      switchMap(() => this.fetchMe())
    );
  }

  register(data: Partial<Usuario> & { password: string }): Observable<Usuario> {
    const url = environment.apiBase + environment.endpoints.register;
    const payload = { nombre: data.nombre, apellido: data.apellido, email: data.email, password: data.password };
    return this.http.post<any>(url, payload).pipe(
      switchMap(() => this.login({ email: data.email!, password: data.password }))
    );
  }

  fetchMe(): Observable<Usuario> {
    const url = environment.apiBase + environment.endpoints.me;
    const token = this.getToken();
    if (!token) { this.logout(); return of(null as unknown as Usuario); }
    return this.http.get<any>(url).pipe(
      map((r) => this.normalizeUser({ id: r.id, nombre: r.nombre, apellido: r.apellido, email: r.email, rol: r.rol }) as Usuario),
      tap((u) => this.setUser(u))
    );
  }

  /** NO llamar setUser aquí */
  public patchLocalUser(patch: Partial<Usuario>): void {
    const current = this.user;
    if (!current) return;

    const merged: Usuario = { ...current, ...patch } as Usuario;
    localStorage.setItem(USER_KEY, JSON.stringify(merged));
    this._user$.next(merged);
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    this.setUser(null);
    this.wipeExternalAuthArtifacts();
  }
}
