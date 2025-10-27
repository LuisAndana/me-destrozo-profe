import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface UserProfile {
  id: number;
  nombre?: string;
  apellido?: string;
  email: string;
  rol: string;
  sexo?: 'Masculino' | 'Femenino' | 'Otro' | null;
  edad?: number | null;
  pesoKg?: number | null;
  estaturaCm?: number | null;
  imc?: number | null;
  problemas?: string | null;
  enfermedades?: string | null;
  fotoUrl?: string | null;
  updatedAt?: string | null;
}

export interface UpdatePerfilBody {
  nombre?: string;
  apellido?: string;
  sexo?: 'Masculino' | 'Femenino' | 'Otro';
  edad?: number;
  pesoKg?: number;
  estaturaCm?: number;
  problemas?: string;
  enfermedades?: string;
  imc?: number;
}

export interface RutinaItem { nombre: string; duracionMin: number; }
export interface RutinaHoy { totalMin: number; bloques: RutinaItem[]; }
export interface ProgresoSemanal { porcentaje: number; sesionesCompletadas: number; objetivoSemanal: number; }
export interface Mensaje { id: number; asunto: string; resumen: string; fecha: string; leido: boolean; }
export interface BandejaMensajes { nuevos: number; mensajes: Mensaje[]; }
export interface CambioPerfil {
  id: number;
  fecha: string;   // ISO
  cambios: Record<string, unknown>;
  campo: string;   // "pesoKg", "estaturaCm", "nombre", etc.
  antes: string | number | null;
  despues: string | number | null;
}

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api = `${environment.apiBase}/usuarios`;

  private jsonHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    let h = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) h = h.set('Authorization', `Bearer ${token}`);
    return h;
  }

  private formHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    let h = new HttpHeaders();
    if (token) h = h.set('Authorization', `Bearer ${token}`);
    return h;
  }

  getPerfil(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.api}/me`, { headers: this.jsonHeaders() });
  }

  /** Actualiza datos del perfil y devuelve el perfil resultante. */
  updatePerfil(body: UpdatePerfilBody): Observable<UserProfile> {
    const url = this.api + '/perfil'; // <- sin backslashes
    return this.http.patch<UserProfile>(url, body, { headers: this.jsonHeaders() });
  }

  uploadAvatar(file: File): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('avatar', file);
    return this.http.post<{ url: string }>(`${this.api}/perfil/avatar`, fd, { headers: this.formHeaders() });
  }

  getCambios(limit = 30): Observable<CambioPerfil[]> {
    return this.http.get<CambioPerfil[]>(`${this.api}/perfil/cambios`, {
      headers: this.jsonHeaders(), params: { limit: String(limit) },
    });
  }

  getRutinaHoy(userId?: number): Observable<RutinaHoy> {
    const id = this.requireUserId(userId);
    return this.http.get<RutinaHoy>(`${this.api}/rutinas/hoy`, {
      headers: this.jsonHeaders(), params: { userId: String(id) },
    });
  }

  getProgresoSemanal(userId?: number): Observable<ProgresoSemanal> {
    const id = this.requireUserId(userId);
    return this.http.get<ProgresoSemanal>(`${this.api}/progreso/semana`, {
      headers: this.jsonHeaders(), params: { userId: String(id) },
    });
  }

  getMensajes(userId?: number, limit = 5): Observable<BandejaMensajes> {
    const id = this.requireUserId(userId);
    return this.http.get<BandejaMensajes>(`${this.api}/mensajes`, {
      headers: this.jsonHeaders(), params: { userId: String(id), limit: String(limit) },
    });
  }

  private requireUserId(userId?: number): number {
    const id = userId ?? this.auth.user?.id_usuario;
    if (id == null) throw new Error('No hay usuario autenticado.');
    return id;
  }
}
