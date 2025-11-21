// src/app/core/services/resena.service.ts
// Servicio para gestionar reseñas (crear, actualizar, eliminar, obtener)

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ResenaCreate,
  ResenaUpdate,
  ResenaOut,
  EstadisticasEntrenador,
  CrearResenasPruebaResponse
} from '../models/resena.models';

@Injectable({
  providedIn: 'root'
})
export class ResenaService {
  private apiUrl = `${environment.apiBase}/resenas`;

  constructor(private http: HttpClient) {}

  /**
   * ✅ Crear una nueva reseña
   * POST /resenas?user_id={id}&body={payload}
   */
  crearResena(userId: number, resena: ResenaCreate): Observable<ResenaOut> {
    let params = new HttpParams().set('user_id', userId.toString());
    return this.http.post<ResenaOut>(`${this.apiUrl}`, resena, { params });
  }

  /**
   * ✅ Obtener una reseña específica
   * GET /resenas/{id_resena}
   */
  obtenerResena(idResena: number): Observable<ResenaOut> {
    return this.http.get<ResenaOut>(`${this.apiUrl}/${idResena}`);
  }

  /**
   * ✅ Actualizar una reseña
   * PATCH /resenas/{id_resena}?user_id={id}
   */
  actualizarResena(
    idResena: number,
    userId: number,
    resena: ResenaUpdate
  ): Observable<ResenaOut> {
    let params = new HttpParams().set('user_id', userId.toString());
    return this.http.patch<ResenaOut>(
      `${this.apiUrl}/${idResena}`,
      resena,
      { params }
    );
  }

  /**
   * ✅ Eliminar una reseña
   * DELETE /resenas/{id_resena}?user_id={id}
   */
  eliminarResena(idResena: number, userId: number): Observable<void> {
    let params = new HttpParams().set('user_id', userId.toString());
    return this.http.delete<void>(`${this.apiUrl}/${idResena}`, { params });
  }

  /**
   * ✅ Obtener todas las reseñas de un entrenador
   * GET /resenas/entrenador/{id_entrenador}/resenas?limit={limit}
   */
  obtenerResenasEntrenador(
    idEntrenador: number,
    limit: number = 10
  ): Observable<ResenaOut[]> {
    let params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ResenaOut[]>(
      `${this.apiUrl}/entrenador/${idEntrenador}/resenas`,
      { params }
    );
  }

  /**
   * ✅ Obtener estadísticas de calificación de un entrenador
   * GET /resenas/entrenador/{id_entrenador}/estadisticas
   */
  obtenerEstadisticasEntrenador(idEntrenador: number): Observable<EstadisticasEntrenador> {
    return this.http.get<EstadisticasEntrenador>(
      `${this.apiUrl}/entrenador/${idEntrenador}/estadisticas`
    );
  }

  /**
   * ✅ Obtener la reseña que el usuario actual hizo a un entrenador
   * GET /resenas/mi-resena/{id_entrenador}?user_id={id}
   */
  obtenerMiResena(idEntrenador: number, userId: number): Observable<ResenaOut | null> {
    let params = new HttpParams().set('user_id', userId.toString());
    return this.http.get<ResenaOut | null>(
      `${this.apiUrl}/mi-resena/${idEntrenador}`,
      { params }
    );
  }

  // ============================================================
  // ENDPOINTS DE PRUEBA (SOLO DESARROLLO)
  // ============================================================

  /**
   * 🧪 PRUEBA: Obtener TODAS las reseñas del sistema
   */
  obtenerTodasResenas(limit: number = 100): Observable<ResenaOut[]> {
    let params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ResenaOut[]>(`${this.apiUrl}/test/todas`, { params });
  }

  /**
   * 🧪 PRUEBA: Obtener todas las reseñas de un usuario
   */
  obtenerResenasUsuario(userId: number): Observable<ResenaOut[]> {
    return this.http.get<ResenaOut[]>(`${this.apiUrl}/test/usuario/${userId}/resenas`);
  }

  /**
   * 🧪 PRUEBA: Crear reseñas de prueba automáticamente
   */
  crearResenasPrueba(
    idEntrenador: number,
    numResenas: number = 5
  ): Observable<CrearResenasPruebaResponse> {
    let params = new HttpParams()
      .set('id_entrenador', idEntrenador.toString())
      .set('num_resenas', numResenas.toString());

    return this.http.post<CrearResenasPruebaResponse>(
      `${this.apiUrl}/test/crear-resenas-prueba`,
      null,
      { params }
    );
  }

  /**
   * 🧪 PRUEBA: Limpiar todas las reseñas de un entrenador
   */
  limpiarResenasEntrenador(idEntrenador: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/test/limpiar-entrenador/${idEntrenador}`
    );
  }

  /**
   * 🧪 PRUEBA: Limpiar todas las reseñas de un usuario
   */
  limpiarResenasUsuario(userId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/test/limpiar-usuario/${userId}`
    );
  }

  /**
   * 🧪 PRUEBA: Actualizar calificación de una reseña rápidamente
   */
  actualizarCalificacionTest(
    idResena: number,
    nuevaCalificacion: number
  ): Observable<any> {
    let params = new HttpParams().set('nueva_calificacion', nuevaCalificacion.toString());
    return this.http.post<any>(
      `${this.apiUrl}/test/actualizar-calificacion/${idResena}`,
      null,
      { params }
    );
  }
}