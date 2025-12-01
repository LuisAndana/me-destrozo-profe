// src/app/core/services/entrenador.service.ts - VERSIÓN CORREGIDA
// ✅ Avatar y Evidencias funcionan correctamente

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
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
  
  /** Headers para JSON requests */
  private jsonHeaders(): HttpHeaders {
    const token = localStorage.getItem('gym_token') || 
                 localStorage.getItem('token') || '';
    
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    
    if (token && token.length > 10) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

  /** ✅ Headers para FormData (NO incluir Content-Type, browser lo calcula) */
  private formHeaders(): HttpHeaders {
    const token = localStorage.getItem('gym_token') || 
                 localStorage.getItem('token') || '';
    
    let headers = new HttpHeaders();
    // ⚠️ NO poner Content-Type aquí para FormData
    // El browser lo calcula automáticamente como multipart/form-data
    
    if (token && token.length > 10) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
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
      headers: this.jsonHeaders(),
    });
  }

  /** ================== DETALLE DE ENTRENADOR ================== */
  getEntrenadorDetalle(id: number): Observable<TrainerDetail> {
    return this.http
      .get<TrainerDetail>(`${TRAINERS_BASE}/${id}`, {
        headers: this.jsonHeaders(),
      })
      .pipe(
        map((data) => ({
          ...data,
          precio_mensual: data.precio_mensual ?? 400,
        }))
      );
  }

  /** ================== PERFIL ================== */
  
  /**
   * ✅ CORREGIDO: Obtiene el perfil del entrenador autenticado
   * Usa JWT token en header
   * Sin query parameters
   */
  getPerfil(idEntrenador?: number): Observable<PerfilEntrenador> {
    const url = `${USERS_BASE}/entrenador/perfil`;
    console.log(`📡 GET ${url}`);

    return this.http.get<PerfilEntrenador>(url, {
      headers: this.jsonHeaders(),
    }).pipe(
      catchError(err => {
        console.error('❌ Error en getPerfil:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * ✅ CORREGIDO: Actualiza el perfil del entrenador autenticado
   * Usa JWT token en header
   * Sin query parameters
   */
  updatePerfil(
    data: PerfilEntrenador,
    idEntrenador?: number
  ): Observable<PerfilEntrenador> {
    const url = `${USERS_BASE}/entrenador/perfil`;
    console.log(`📡 PUT ${url}`);

    return this.http.put<PerfilEntrenador>(url, data, {
      headers: this.jsonHeaders(),
    }).pipe(
      catchError(err => {
        console.error('❌ Error en updatePerfil:', err);
        return throwError(() => err);
      })
    );
  }

  /** ================== AVATAR ================== */
  
  /**
   * ✅ CORREGIDO: Sube avatar del entrenador autenticado
   * 
   * IMPORTANTE:
   * - Usa FormData para enviar archivo
   * - Clave DEBE ser 'avatar' (como espera FastAPI)
   * - NO incluir Content-Type header (browser lo calcula)
   * - JWT token en Authorization header
   * 
   * @param file Archivo de imagen
   * @param idEntrenador ID opcional (no necesario con JWT token)
   * @returns Observable con URL de la foto
   */
  uploadAvatar(
    file: File,
    idEntrenador?: number
  ): Observable<{ foto_url?: string; url?: string }> {
    console.log('📸 [uploadAvatar] Iniciando carga de archivo');
    console.log('   Archivo:', file.name);
    console.log('   Size:', file.size, 'bytes');
    console.log('   Type:', file.type);

    // ✅ Crear FormData correctamente
    const formData = new FormData();
    formData.append('avatar', file);  // ← CLAVE CORRECTA para /perfil/avatar

    const url = `${USERS_BASE}/perfil/avatar`;
    console.log(`📡 POST ${url}`);

    return this.http.post<{ foto_url?: string; url?: string }>(
      url,
      formData,  // ← FormData crudo
      { headers: this.formHeaders() }  // ← Headers SIN Content-Type
    ).pipe(
      map(response => {
        console.log('✅ Response:', response);
        return {
          foto_url: response.foto_url || response.url,
          url: response.url || response.foto_url
        };
      }),
      catchError(err => {
        console.error('❌ Error en uploadAvatar:', err);
        console.error('   Status:', err.status);
        console.error('   Message:', err.message);
        return throwError(() => err);
      })
    );
  }

  /**
   * ✅ CORREGIDO: Elimina avatar del entrenador autenticado
   */
  deleteAvatar(idEntrenador?: number): Observable<void> {
    const url = `${USERS_BASE}/perfil/avatar`;
    console.log(`📡 DELETE ${url}`);

    return this.http.delete<void>(url, {
      headers: this.jsonHeaders(),
    }).pipe(
      catchError(err => {
        console.error('❌ Error en deleteAvatar:', err);
        return throwError(() => err);
      })
    );
  }

  /** ================== EVIDENCIAS ================== */
  
  /**
   * ✅ CORREGIDO: Sube evidencia/certificado del entrenador autenticado
   * 
   * IMPORTANTE:
   * - Usa FormData para enviar archivo
   * - Clave DEBE ser 'file' (como espera FastAPI)
   * - NO incluir Content-Type header (browser lo calcula)
   * - JWT token en Authorization header
   * 
   * @param file Archivo (PDF, imagen, etc.)
   * @param idEntrenador ID opcional (no necesario con JWT token)
   * @returns Observable con URL del archivo subido
   */
  uploadEvidence(
    file: File,
    idEntrenador?: number
  ): Observable<{ url: string; filename?: string; success: boolean }> {
    console.log('📄 [uploadEvidence] Iniciando carga de evidencia');
    console.log('   Archivo:', file.name);
    console.log('   Size:', file.size, 'bytes');
    console.log('   Type:', file.type);

    // ✅ Crear FormData correctamente
    const formData = new FormData();
    formData.append('file', file);  // ← CLAVE CORRECTA para /entrenador/evidencia

    const url = `${USERS_BASE}/entrenador/evidencia`;
    console.log(`📡 POST ${url}`);

    return this.http.post<{ url: string; filename?: string; success: boolean }>(
      url,
      formData,  // ← FormData crudo
      { headers: this.formHeaders() }  // ← Headers SIN Content-Type
    ).pipe(
      map(response => {
        console.log('✅ Response:', response);
        return {
          url: response.url,
          filename: response.filename,
          success: response.success ?? true
        };
      }),
      catchError(err => {
        console.error('❌ Error en uploadEvidence:', err);
        console.error('   Status:', err.status);
        console.error('   Message:', err.message);
        return throwError(() => err);
      })
    );
  }

  /** ================== CLIENTES DEL ENTRENADOR ================== */
  getMisClientes(idEntrenador?: number): Observable<any[]> {
    const resolvedId =
      idEntrenador ?? Number(localStorage.getItem('id_entrenador') || 0);

    if (!resolvedId) {
      console.error('❌ getMisClientes: id_entrenador requerido y no está definido');
      return throwError(() => new Error('id_entrenador requerido'));
    }

    const url = `${CLIENTE_ENTRENADOR_BASE}/mis-clientes/${resolvedId}`;
    console.log('📡 GET Mis Clientes URL:', url);
    
    return this.http.get<any[]>(url, { headers: this.jsonHeaders() }).pipe(
      catchError(err => {
        console.error('❌ Error en getMisClientes:', err);
        return throwError(() => err);
      })
    );
  }

  /** ================== INTEGRIDAD ================== */
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
      }),
      catchError(() => {
        return of({
          success: false,
          has_json: false,
          needs_sync: false,
          synced: false,
        });
      })
    );
  }
}
