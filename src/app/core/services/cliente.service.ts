// src/app/core/services/cliente.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';



/* ====== MODELOS QUE YA TENÍAS ====== */
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

/* ====== MODELOS NUEVOS ====== */
export interface CambioPerfil {
  id: number;
  fecha: string;   // ISO
  cambios: Record<string, unknown>;
  campo: string;   // p.ej. "pesoKg", "estaturaCm", "nombre"
  antes: string | number | null;
  despues: string | number | null;
}

/** Patch permitido para actualizar perfil (ajústalo a tu backend si es necesario) */
export interface PerfilPatch {
  nombre?: string;
  sexo?: 'Masculino' | 'Femenino' | 'Otro';
  pesoKg?: number | null;
  estaturaCm?: number | null;
  edad?: number | null;
  problemas?: string | null;
  enfermedades?: string[];  // si decides enviarlas como lista
  imc?: number | null;
}


export class ClienteService {
  // 👇 añade el prefijo del router
  private api = `${environment.apiBase}/usuarios`;

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }

  getPerfil(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.api}/me`, { headers: this.headers() });
  }
      /* =================== DASHBOARD =================== */
  getRutinaHoy(userId: number): Observable<RutinaHoy> {
    return this.http.get<RutinaHoy>(`${this.api}/rutinas/hoy`, {
      headers: this.headers(), params: { userId: String(userId) },
    });
  }

  getProgresoSemanal(userId: number): Observable<ProgresoSemanal> {
    return this.http.get<ProgresoSemanal>(`${this.api}/progreso/semana`, {
      headers: this.headers(), params: { userId: String(userId) },
    });
  }

  getMensajes(userId: number, limit = 5): Observable<BandejaMensajes> {
    return this.http.get<BandejaMensajes>(`${this.api}/mensajes`, {
      headers: this.headers(), params: { userId: String(userId), limit: String(limit) },
    });
  }

  uploadAvatar(file: File): Observable<{ url: string }> {
    const fd = new FormData(); fd.append('avatar', file);
    // sin Content-Type manual:
    const token = localStorage.getItem('token') || '';
    return this.http.post<{ url: string }>(`${this.api}/perfil/avatar`, fd, {
      headers: token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined,
    });
  }


  /**
   * Historial de cambios del usuario.
   * Endpoint sugerido: GET /users/:id/changes?limit=30
   * Si tu backend lo expone como /perfil/cambios, cámbialo en la URL.
   */
  getCambios(limit = 30): Observable<CambioPerfil[]> {
    return this.http.get<CambioPerfil[]>(`${this.api}/perfil/cambios`, {
      params: { limit: String(limit) },
    });
  }
}