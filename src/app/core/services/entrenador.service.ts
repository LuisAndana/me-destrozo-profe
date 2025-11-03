import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TrainersResponse, TrainerDetail, PerfilEntrenador } from '../models/trainer.model';

const API = (window as any).env?.apiUrl || 'http://localhost:8000';
const USERS_BASE = `${API}/usuarios`;
const TRAINERS_BASE = `${API}/entrenadores`;

@Injectable({ providedIn: 'root' })
export class EntrenadorService {
  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getEntrenadores(params: {
    q?: string;
    especialidad?: string;
    modalidad?: 'Online' | 'Presencial';
    ratingMin?: number;
    precioMax?: number | '';
    ciudad?: string;
    sort?: 'relevance' | 'rating' | 'experience' | 'price_asc' | 'price_desc';
    page?: number;
    pageSize?: number;
  }): Observable<TrainersResponse> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        httpParams = httpParams.set(k, String(v));
      }
    });
    return this.http.get<TrainersResponse>(TRAINERS_BASE, {
      params: httpParams,
      headers: this.authHeaders(),
    });
  }

  /* ===== Detalle de entrenador ===== */
  getEntrenadorDetalle(id: number): Observable<TrainerDetail> {
    return this.http.get<TrainerDetail>(`${TRAINERS_BASE}/${id}`, {
      headers: this.authHeaders(),
    });
  }

  /* ===== Perfil del entrenador (del usuario autenticado) ===== */
  getPerfil(): Observable<PerfilEntrenador> {
    return this.http.get<PerfilEntrenador>(`${USERS_BASE}/entrenador/perfil`, {
      headers: this.authHeaders(),
    });
  }

  updatePerfil(data: PerfilEntrenador): Observable<PerfilEntrenador> {
    return this.http.put<PerfilEntrenador>(`${USERS_BASE}/entrenador/perfil`, data, {
      headers: this.authHeaders(),
    });
  }

  uploadEvidence(file: File): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ url: string }>(`${USERS_BASE}/entrenador/evidencia`, fd, {
      headers: this.authHeaders(),
    });
  }

  uploadAvatar(file: File): Observable<{ foto_url: string } | { url: string }> {
    const fd = new FormData();
    fd.append('avatar', file);
    return this.http.post<{ foto_url: string } | { url: string }>(`${USERS_BASE}/perfil/avatar`, fd, {
      headers: this.authHeaders(),
    });
  }

  deleteAvatar(): Observable<void> {
    return this.http.delete<void>(`${USERS_BASE}/perfil/avatar`, {
      headers: this.authHeaders(),
    });
  }
}
