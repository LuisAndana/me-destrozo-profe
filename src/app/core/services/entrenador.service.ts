// src/app/core/services/entrenador.service.ts - VERSIÓN COMPLETA Y FINAL
// ✅ Avatar, Evidencias y todos los métodos funcionan correctamente

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { TrainersResponse, TrainerDetail, PerfilEntrenador } from '../models/trainer.model';

// ✅ Base de la API - USA RAILWAY EN PRODUCCIÓN
const API = (window as any).env?.apiUrl || 'https://web-production-03d9e.up.railway.app';
const USERS_BASE = `${API}/usuarios`;
const TRAINERS_BASE = `${API}/entrenadores`;
const UPLOAD_BASE = `${API}/api/upload`;
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
  
  /**
   * 📋 Obtiene lista de entrenadores con filtros
   * 
   * @param params Parámetros de búsqueda y filtrado
   * @returns Observable<TrainersResponse>
   */
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
    console.log('📡 GET Entrenadores con filtros:', params);
    
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        httpParams = httpParams.set(k, String(v));
      }
    });

    return this.http.get<TrainersResponse>(TRAINERS_BASE, {
      params: httpParams,
      headers: this.jsonHeaders(),
    }).pipe(
      map(response => {
        console.log('✅ Entrenadores obtenidos:', response);
        return response;
      }),
      catchError(err => {
        console.error('❌ Error en getEntrenadores:', err);
        return throwError(() => err);
      })
    );
  }

  /** ================== DETALLE DE ENTRENADOR ================== */
  
  /**
   * 👤 Obtiene el detalle de un entrenador por ID
   * 
   * @param id ID del entrenador
   * @returns Observable<TrainerDetail>
   */
  getEntrenadorDetalle(id: number): Observable<TrainerDetail> {
    const url = `${TRAINERS_BASE}/${id}`;
    console.log(`📡 GET ${url}`);
    
    return this.http.get<TrainerDetail>(url, {
      headers: this.jsonHeaders(),
    }).pipe(
      map((data) => {
        console.log('✅ Detalle obtenido:', data);
        return {
          ...data,
          precio_mensual: data.precio_mensual ?? 400,
        };
      }),
      catchError(err => {
        console.error('❌ Error en getEntrenadorDetalle:', err);
        return throwError(() => err);
      })
    );
  }

  /** ================== PERFIL DEL ENTRENADOR AUTENTICADO ================== */
  
  /**
   * 👤 Obtiene el perfil del entrenador autenticado
   * Usa JWT token en header
   * Sin query parameters
   * 
   * @param idEntrenador ID opcional (no necesario con JWT token)
   * @returns Observable<PerfilEntrenador>
   */
  getPerfil(idEntrenador?: number): Observable<PerfilEntrenador> {
    const url = `${USERS_BASE}/entrenador/perfil`;
    console.log(`📡 GET ${url}`);

    return this.http.get<PerfilEntrenador>(url, {
      headers: this.jsonHeaders(),
    }).pipe(
      map(response => {
        console.log('✅ Perfil obtenido:', response);
        return response;
      }),
      catchError(err => {
        console.error('❌ Error en getPerfil:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * ✏️ Actualiza el perfil del entrenador autenticado
   * Usa JWT token en header
   * Sin query parameters
   * 
   * @param data Datos del perfil a actualizar
   * @param idEntrenador ID opcional (no necesario con JWT token)
   * @returns Observable<PerfilEntrenador>
   */
  updatePerfil(
    data: PerfilEntrenador,
    idEntrenador?: number
  ): Observable<PerfilEntrenador> {
    const url = `${USERS_BASE}/entrenador/perfil`;
    console.log(`📡 PUT ${url}`, data);

    return this.http.put<PerfilEntrenador>(url, data, {
      headers: this.jsonHeaders(),
    }).pipe(
      map(response => {
        console.log('✅ Perfil actualizado:', response);
        return response;
      }),
      catchError(err => {
        console.error('❌ Error en updatePerfil:', err);
        return throwError(() => err);
      })
    );
  }

  /** ================== AVATAR ================== */
  
  /**
   * 📸 Sube avatar del entrenador autenticado
   * 
   * IMPORTANTE:
   * - Usa FormData para enviar archivo
   * - Optimiza automáticamente la imagen
   * - Crea thumbnail
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
  ): Observable<{ imagen?: string; url?: string; foto_url?: string; thumbnail?: string }> {
    console.log('📸 [uploadAvatar] Iniciando carga de archivo');
    console.log('   Archivo:', file.name);
    console.log('   Size:', file.size, 'bytes');
    console.log('   Type:', file.type);

    // ✅ Crear FormData correctamente
    const formData = new FormData();
    formData.append('file', file);  // ← Clave para /api/upload/profile-photo

    const url = `${UPLOAD_BASE}/profile-photo`;
    console.log(`📡 POST ${url}`);

    return this.http.post<any>(
      url,
      formData,  // ← FormData crudo
      { headers: this.formHeaders() }  // ← Headers SIN Content-Type
    ).pipe(
      map(response => {
        console.log('✅ Avatar subido correctamente:', response);
        return {
          imagen: response.imagen || response.url,
          url: response.imagen || response.url,
          foto_url: response.imagen || response.url,
          thumbnail: response.thumbnail
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
   * 🗑️ Elimina avatar del entrenador autenticado
   * 
   * @param idEntrenador ID opcional (no necesario con JWT token)
   * @returns Observable<void>
   */
  deleteAvatar(idEntrenador?: number): Observable<void> {
    const url = `${USERS_BASE}/perfil/avatar`;
    console.log(`📡 DELETE ${url}`);

    return this.http.delete<void>(url, {
      headers: this.jsonHeaders(),
    }).pipe(
      map(() => {
        console.log('✅ Avatar eliminado');
        return;
      }),
      catchError(err => {
        console.error('❌ Error en deleteAvatar:', err);
        return throwError(() => err);
      })
    );
  }

  /** ================== EVIDENCIAS / CERTIFICADOS ================== */
  
  /**
   * 📄 Sube evidencia/certificado del entrenador autenticado
   * 
   * IMPORTANTE:
   * - Usa FormData para enviar archivo
   * - Clave DEBE ser 'file'
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

    return this.http.post<any>(
      url,
      formData,  // ← FormData crudo
      { headers: this.formHeaders() }  // ← Headers SIN Content-Type
    ).pipe(
      map(response => {
        console.log('✅ Evidencia subida correctamente:', response);
        return {
          url: response.url || response.filename,
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

  /**
   * 📋 Obtiene las evidencias del entrenador autenticado
   * 
   * @returns Observable con lista de evidencias
   */
  getEvidencias(): Observable<any[]> {
    const url = `${USERS_BASE}/entrenador/evidencia`;
    console.log(`📡 GET ${url}`);

    return this.http.get<any[]>(url, {
      headers: this.jsonHeaders(),
    }).pipe(
      map(response => {
        console.log('✅ Evidencias obtenidas:', response);
        return response;
      }),
      catchError(err => {
        console.error('❌ Error en getEvidencias:', err);
        return of([]);  // Retornar array vacío en caso de error
      })
    );
  }

  /**
   * 🗑️ Elimina una evidencia
   * 
   * @param filename Nombre del archivo a eliminar
   * @returns Observable<void>
   */
  deleteEvidencia(filename: string): Observable<void> {
    const url = `${USERS_BASE}/entrenador/evidencia/${filename}`;
    console.log(`📡 DELETE ${url}`);

    return this.http.delete<void>(url, {
      headers: this.jsonHeaders(),
    }).pipe(
      map(() => {
        console.log('✅ Evidencia eliminada:', filename);
        return;
      }),
      catchError(err => {
        console.error('❌ Error en deleteEvidencia:', err);
        return throwError(() => err);
      })
    );
  }

  /** ================== IMÁGENES (UPLOAD SERVICE) ================== */
  
  /**
   * 🖼️ Obtiene URL de una imagen del servidor de uploads
   * 
   * @param filename Nombre del archivo
   * @returns URL de la imagen
   */
  getImageUrl(filename: string): string {
    return `${UPLOAD_BASE}/image/${filename}`;
  }

  /**
   * 🗑️ Elimina una imagen del servidor de uploads
   * 
   * @param filename Nombre del archivo a eliminar
   * @returns Observable<any>
   */
  deleteImage(filename: string): Observable<any> {
    const url = `${UPLOAD_BASE}/image/${filename}`;
    console.log(`📡 DELETE ${url}`);

    return this.http.delete<any>(url, {
      headers: this.jsonHeaders(),
    }).pipe(
      map(response => {
        console.log('✅ Imagen eliminada:', filename);
        return response;
      }),
      catchError(err => {
        console.error('❌ Error en deleteImage:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * 🏥 Verifica el estado del servicio de uploads
   * 
   * @returns Observable con estado del servicio
   */
  getUploadHealth(): Observable<any> {
    const url = `${UPLOAD_BASE}/health`;
    console.log(`📡 GET ${url}`);

    return this.http.get<any>(url, {
      headers: this.jsonHeaders(),
    }).pipe(
      map(response => {
        console.log('✅ Upload service health:', response);
        return response;
      }),
      catchError(err => {
        console.error('❌ Error en getUploadHealth:', err);
        return throwError(() => err);
      })
    );
  }

  /** ================== CLIENTES DEL ENTRENADOR ================== */
  
  /**
   * 👥 Obtiene la lista de clientes del entrenador autenticado
   * 
   * @param idEntrenador ID del entrenador (opcional, usa localStorage si no se proporciona)
   * @returns Observable<any[]>
   */
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
      map(response => {
        console.log('✅ Mis clientes obtenidos:', response);
        return response;
      }),
      catchError(err => {
        console.error('❌ Error en getMisClientes:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * 👤 Obtiene un cliente específico del entrenador
   * 
   * @param idCliente ID del cliente
   * @returns Observable<any>
   */
  getCliente(idCliente: number): Observable<any> {
    const url = `${USERS_BASE}/usuarios/${idCliente}`;
    console.log(`📡 GET ${url}`);

    return this.http.get<any>(url, {
      headers: this.jsonHeaders(),
    }).pipe(
      map(response => {
        console.log('✅ Cliente obtenido:', response);
        return response;
      }),
      catchError(err => {
        console.error('❌ Error en getCliente:', err);
        return throwError(() => err);
      })
    );
  }

  /** ================== ESTADÍSTICAS ================== */
  
  /**
   * 📊 Obtiene estadísticas del entrenador autenticado
   * 
   * @returns Observable<any>
   */
  getEstadisticas(): Observable<any> {
    const url = `${USERS_BASE}/entrenador/estadisticas`;
    console.log(`📡 GET ${url}`);

    return this.http.get<any>(url, {
      headers: this.jsonHeaders(),
    }).pipe(
      map(response => {
        console.log('✅ Estadísticas obtenidas:', response);
        return response;
      }),
      catchError(err => {
        console.error('❌ Error en getEstadisticas:', err);
        return of({});  // Retornar objeto vacío en caso de error
      })
    );
  }

  /** ================== INTEGRIDAD / VERIFICACIÓN ================== */
  
  /**
   * ✅ Verifica la integridad del perfil del entrenador
   * 
   * @returns Observable con estado de integridad
   */
  verificarIntegridad(): Observable<{
    success: boolean;
    has_json: boolean;
    needs_sync: boolean;
    synced: boolean;
  }> {
    const raw = localStorage.getItem('id_entrenador') || '0';
    const id = parseInt(raw, 10) || 0;

    if (!id) {
      console.warn('❌ verificarIntegridad: sin id_entrenador');
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
        console.log('✅ Integridad verificada');
        return {
          success: true,
          has_json: hasJson,
          needs_sync: false,
          synced: true,
        };
      }),
      catchError(() => {
        console.error('❌ Error verificando integridad');
        return of({
          success: false,
          has_json: false,
          needs_sync: false,
          synced: false,
        });
      })
    );
  }

  /** ================== BÚSQUEDA ================== */
  
  /**
   * 🔍 Busca entrenadores por término
   * 
   * @param query Término de búsqueda
   * @param limit Límite de resultados
   * @returns Observable<TrainerDetail[]>
   */
  buscarEntrenadores(query: string, limit: number = 10): Observable<TrainerDetail[]> {
    const params = new HttpParams()
      .set('q', query)
      .set('limit', String(limit));

    const url = `${TRAINERS_BASE}/buscar`;
    console.log(`📡 GET ${url}?q=${query}`);

    return this.http.get<TrainerDetail[]>(url, {
      params,
      headers: this.jsonHeaders(),
    }).pipe(
      map(response => {
        console.log('✅ Búsqueda completada:', response);
        return response;
      }),
      catchError(err => {
        console.error('❌ Error en buscarEntrenadores:', err);
        return of([]);
      })
    );
  }

  /** ================== CONTACTO / MENSAJES ================== */
  
  /**
   * 💬 Envía un mensaje a un entrenador
   * 
   * @param idEntrenador ID del entrenador
   * @param mensaje Contenido del mensaje
   * @returns Observable<any>
   */
  enviarMensaje(idEntrenador: number, mensaje: string): Observable<any> {
    const url = `${API}/mensajes`;
    const data = {
      id_destinatario: idEntrenador,
      contenido: mensaje
    };

    console.log(`📡 POST ${url}`, data);

    return this.http.post<any>(url, data, {
      headers: this.jsonHeaders(),
    }).pipe(
      map(response => {
        console.log('✅ Mensaje enviado:', response);
        return response;
      }),
      catchError(err => {
        console.error('❌ Error en enviarMensaje:', err);
        return throwError(() => err);
      })
    );
  }

  /** ================== CALIFICACIONES ================== */
  
  /**
   * ⭐ Obtiene la calificación del entrenador
   * 
   * @param idEntrenador ID del entrenador
   * @returns Observable<number>
   */
  getCalificacion(idEntrenador: number): Observable<number> {
    const url = `${TRAINERS_BASE}/${idEntrenador}/rating`;
    console.log(`📡 GET ${url}`);

    return this.http.get<{ rating: number }>(url, {
      headers: this.jsonHeaders(),
    }).pipe(
      map(response => {
        console.log('✅ Calificación obtenida:', response.rating);
        return response.rating;
      }),
      catchError(err => {
        console.error('❌ Error en getCalificacion:', err);
        return of(0);
      })
    );
  }

  /**
   * ⭐ Califica al entrenador
   * 
   * @param idEntrenador ID del entrenador
   * @param rating Puntuación (1-5)
   * @param comentario Comentario opcional
   * @returns Observable<any>
   */
  calificarEntrenador(
    idEntrenador: number,
    rating: number,
    comentario?: string
  ): Observable<any> {
    const url = `${TRAINERS_BASE}/${idEntrenador}/rating`;
    const data = { rating, comentario };

    console.log(`📡 POST ${url}`, data);

    return this.http.post<any>(url, data, {
      headers: this.jsonHeaders(),
    }).pipe(
      map(response => {
        console.log('✅ Calificación registrada:', response);
        return response;
      }),
      catchError(err => {
        console.error('❌ Error en calificarEntrenador:', err);
        return throwError(() => err);
      })
    );
  }
}