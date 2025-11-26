import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { TrainersResponse, TrainerDetail, PerfilEntrenador } from '../models/trainer.model';

// ✅ Base de la API - USA RAILWAY EN PRODUCCIÓN
const API = (window as any).env?.apiUrl || 'https://web-production-03d9e.up.railway.app';
const USERS_BASE = `${API}/usuarios`;
const TRAINERS_BASE = `${API}/entrenadores`;
const CLIENTE_ENTRENADOR_BASE = `${API}/cliente-entrenador`;

@Injectable({ providedIn: 'root' })
export class EntrenadorService {
  constructor(private http: HttpClient) {}

  /** ================== HEADERS ================== */
  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  /** ================== LISTA DE ENTRENADORES ================== */
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

  /** ================== DETALLE DE ENTRENADOR ================== */
  getEntrenadorDetalle(id: number): Observable<TrainerDetail> {
    return this.http
      .get<TrainerDetail>(`${TRAINERS_BASE}/${id}`, {
        headers: this.authHeaders(),
      })
      .pipe(
        map((data) => ({
          ...data,
          precio_mensual: data.precio_mensual ?? 400,
        }))
      );
  }

  /** ================== PERFIL ================== */
  // Backend espera ?user_id en Query
  getPerfil(idEntrenador?: number): Observable<PerfilEntrenador> {
    const url = `${USERS_BASE}/entrenador/perfil`;
    let params = new HttpParams();

    if (idEntrenador) {
      params = params.set('user_id', String(idEntrenador));
      console.log(`📡 GET ${url}?user_id=${idEntrenador}`);
    }

    return this.http.get<PerfilEntrenador>(url, {
      params,
      headers: this.authHeaders(),
    });
  }

  updatePerfil(
    data: PerfilEntrenador,
    idEntrenador?: number
  ): Observable<PerfilEntrenador> {
    const url = `${USERS_BASE}/entrenador/perfil`;
    let params = new HttpParams();

    if (idEntrenador) {
      params = params.set('user_id', String(idEntrenador));
      console.log(`📡 PUT ${url}?user_id=${idEntrenador}`);
    }

    return this.http.put<PerfilEntrenador>(url, data, {
      params,
      headers: this.authHeaders(),
    });
  }

  /** ================== AVATAR ================== */
  uploadAvatar(
    file: File,
    idEntrenador?: number
  ): Observable<{ foto_url?: string; url?: string }> {
    const formData = new FormData();
    // ⬅️ Clave correcta que espera /usuarios/perfil/avatar
    formData.append('avatar', file);

    const url = `${USERS_BASE}/perfil/avatar`;
    let params = new HttpParams();

    if (idEntrenador) {
      params = params.set('user_id', String(idEntrenador));
      console.log(`📡 POST ${url}?user_id=${idEntrenador}`);
    }

    return this.http.post<{ foto_url?: string; url?: string }>(url, formData, {
      params,
      headers: this.authHeaders(),
    });
  }

  deleteAvatar(idEntrenador?: number): Observable<void> {
    const url = `${USERS_BASE}/perfil/avatar`;
    let params = new HttpParams();

    if (idEntrenador) {
      params = params.set('user_id', String(idEntrenador));
      console.log(`📡 DELETE ${url}?user_id=${idEntrenador}`);
    }

    return this.http.delete<void>(url, {
      params,
      headers: this.authHeaders(),
    });
  }

  /** ================== EVIDENCIAS ================== */
  uploadEvidence(
    file: File,
    idEntrenador?: number
  ): Observable<{ url: string; success: boolean }> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${USERS_BASE}/entrenador/evidencia`;
    let params = new HttpParams();

    if (idEntrenador) {
      params = params.set('user_id', String(idEntrenador));
      console.log(`📡 POST ${url}?user_id=${idEntrenador}`);
    }

    return this.http.post<{ url: string; success: boolean }>(url, formData, {
      params,
      headers: this.authHeaders(),
    });
  }

  /** ================== CLIENTES DEL ENTRENADOR ================== */
  // Evita 405 asegurando que siempre se mande el ID de entrenador
  getMisClientes(idEntrenador?: number): Observable<any[]> {
    const resolvedId =
      idEntrenador ?? Number(localStorage.getItem('id_entrenador') || 0);

    if (!resolvedId) {
      console.error('❌ getMisClientes: id_entrenador requerido y no está definido');
      return throwError(() => new Error('id_entrenador requerido'));
    }

    const url = `${CLIENTE_ENTRENADOR_BASE}/mis-clientes/${resolvedId}`;
    console.log('📡 GET Mis Clientes URL:', url);
    return this.http.get<any[]>(url, { headers: this.authHeaders() });
  }

  /** ================== INTEGRIDAD (cliente) ================== */
  // No existe /usuarios/entrenador/verificar-integridad en el backend.
  // Devolvemos el shape esperado usando GET perfil.
  verificarIntegridad(): Observable<{
    success: boolean;
    has_json: boolean;
    needs_sync: boolean;
    synced: boolean;
  }> {
    const raw = localStorage.getItem('id_entrenador') || '0';
    const id = parseInt(raw, 10) || 0;

    if (!id) {
      return of({
        success: false,
        has_json: false,
        needs_sync: false,
        synced: false,
      });
    }

    return this.getPerfil(id).pipe(
      map((p) => {
        const hasJson = !!p && Object.keys(p).length > 0;
        return {
          success: true,
          has_json: hasJson,
          needs_sync: false,
          synced: true,
        };
      })
    );
  }
}