// src/app/core/services/cliente.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface UserProfile { id: number; nombre: string; email: string; fotoUrl?: string; }
export interface RutinaItem { nombre: string; duracionMin: number; }
export interface RutinaHoy { totalMin: number; bloques: RutinaItem[]; }
export interface ProgresoSemanal { porcentaje: number; sesionesCompletadas: number; objetivoSemanal: number; }
export interface Mensaje { id: number; asunto: string; resumen: string; fecha: string; leido: boolean; }
export interface BandejaMensajes { nuevos: number; mensajes: Mensaje[]; }

@Injectable({ providedIn: 'root' })
export class ClienteService {
  // Prefijo correcto del router de FastAPI
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
    // GET http://localhost:8000/usuarios/me
    return this.http.get<UserProfile>(`${this.api}/me`, { headers: this.headers() });
  }

  getRutinaHoy(userId: number): Observable<RutinaHoy> {
    // GET http://localhost:8000/usuarios/rutinas/hoy?userId=...
    return this.http.get<RutinaHoy>(`${this.api}/rutinas/hoy`, {
      headers: this.headers(),
      params: { userId: String(userId) },
    });
  }

  getProgresoSemanal(userId: number): Observable<ProgresoSemanal> {
    // GET http://localhost:8000/usuarios/progreso/semana?userId=...
    return this.http.get<ProgresoSemanal>(`${this.api}/progreso/semana`, {
      headers: this.headers(),
      params: { userId: String(userId) },
    });
  }

  getMensajes(userId: number, limit = 5): Observable<BandejaMensajes> {
    // GET http://localhost:8000/usuarios/mensajes?userId=...&limit=...
    return this.http.get<BandejaMensajes>(`${this.api}/mensajes`, {
      headers: this.headers(),
      params: { userId: String(userId), limit: String(limit) },
    });
  }
}
