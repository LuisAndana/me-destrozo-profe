// src/app/core/services/cliente.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-perfil-page',
  template: `
    <section style="padding:24px">
      <h2>Perfil</h2>
      <p>(Aquí va tu editor de perfil)</p>
    </section>
  `,
})
export class PerfilPage {}


import {
  UserProfile,
  UpdatePerfilBody,
  RutinaHoy,
  ProgresoSemanal,
  BandejaMensajes,
  CambioPerfil,
} from '../../core/models/cliente.models'; 

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private api = environment.apiBase; // ej: http://localhost:4000/api

  constructor(private http: HttpClient) {}

  /* =================== PERFIL =================== */

  /** Perfil del usuario autenticado */
  getPerfil(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.api}/me`);
  }

  /** Actualiza datos del perfil (nombre, sexo, peso, estatura, etc.) */
  updatePerfil(body: UpdatePerfilBody): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${this.api}/perfil`, body);
  }

  /** Sube avatar (FormData con key 'avatar') */
  uploadAvatar(file: File): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('avatar', file);
    // No seteamos Content-Type — el navegador agrega el boundary automáticamente
    return this.http.post<{ url: string }>(`${this.api}/perfil/avatar`, fd);
  }

  /** Historial de cambios (el backend toma el userId del token) */
  getCambios(limit = 30): Observable<CambioPerfil[]> {
    return this.http.get<CambioPerfil[]>(`${this.api}/perfil/cambios`, {
      params: { limit: String(limit) },
    });
  }

  /* =================== DASHBOARD (si los usas) =================== */

  getRutinaHoy(userId: number): Observable<RutinaHoy> {
    return this.http.get<RutinaHoy>(`${this.api}/rutinas/hoy`, {
      params: { userId: String(userId) },
    });
  }

  getProgresoSemanal(userId: number): Observable<ProgresoSemanal> {
    return this.http.get<ProgresoSemanal>(`${this.api}/progreso/semana`, {
      params: { userId: String(userId) },
    });
  }

  getMensajes(userId: number, limit = 5): Observable<BandejaMensajes> {
    return this.http.get<BandejaMensajes>(`${this.api}/mensajes`, {
      params: { userId: String(userId), limit: String(limit) },
    });
  }
}
