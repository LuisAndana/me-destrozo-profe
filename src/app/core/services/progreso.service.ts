// progreso.service.ts - VERSIÓN COMPLETA Y MEJORADA
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ============================================================
// INTERFACES
// ============================================================

export interface RegistrarProgresoRequest {
  id_historial: number;
  id_ejercicio: number;
  fecha_sesion: string;
  dia_rutina?: string;
  peso_kg?: number | null;
  series_completadas: number;
  repeticiones_completadas: number;
  tiempo_descanso_segundos?: number;
  rpe?: number;
  calidad_tecnica?: 'excelente' | 'buena' | 'regular' | 'mala';
  estado_animo?: 'excelente' | 'bueno' | 'regular' | 'malo' | null;
  notas?: string;
  dolor_molestias?: string;
}

export interface ProgresoEjercicio {
  id_progreso: number;
  fecha_sesion: Date;
  numero_sesion: number;
  peso_kg: number | null;
  series_completadas: number;
  repeticiones_completadas: number;
  rpe: number | null;
  calidad_tecnica: string;
  peso_anterior: number | null;
  diferencia_peso: number | null;
  porcentaje_mejora: number | null;
  es_record_personal: boolean;
  notas: string | null;
}

export interface EstadisticasProgreso {
  total_sesiones: number;
  peso_inicial: number | null;
  peso_actual: number | null;
  peso_maximo: number | null;
  progreso_total: number | null;
  porcentaje_mejora: number | null;
  rpe_promedio: number | null;
  records_personales: number;
  primera_sesion: Date | null;
  ultima_sesion: Date | null;
  dias_entrenando: number;
}

export interface HistorialRutina {
  id_historial: number;
  nombre_rutina: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  estado: string;
  duracion_dias: number;
  dias_entrenados: number;
  sesiones_completadas: number;
  porcentaje_cumplimiento: number;
  peso_inicial: number | null;
  peso_final: number | null;
  objetivo: string | null;
  entrenador: string | null;
}

export interface AlertaProgresion {
  id_alerta: number;
  tipo_alerta: string;
  prioridad: string;
  titulo: string;
  mensaje: string;
  recomendacion: string | null;
  nombre_ejercicio: string | null;
  peso_actual: number | null;
  peso_sugerido: number | null;
  sesiones_sin_progreso: number | null;
  fecha_generacion: Date;
  estado: string;
}

export interface ObjetivoCliente {
  id_objetivo: number;
  titulo: string;
  descripcion: string | null;
  tipo_objetivo: string;
  valor_inicial: number | null;
  valor_objetivo: number;
  valor_actual: number | null;
  unidad: string;
  porcentaje_completado: number;
  estado: string;
  fecha_inicio: Date;
  fecha_limite: Date;
  fecha_alcanzado: Date | null;
}

export interface DashboardCliente {
  id_cliente: number;
  nombre_cliente: string;
  dias_entrenando: number;
  sesiones_completadas: number;
  rutinas_activas: number;
  ultima_rutina: string | null;
  ultimo_entrenamiento: string | null;
  progreso_general: number;
  resumen: {
    total_rutinas: number;
    rutinas_completadas: number;
    total_sesiones: number;
    cumplimiento_promedio: number;
    ultima_sesion: Date | null;
  };
  alertas_pendientes: number;
  records_este_mes: number;
  objetivos_activos: number;
}

export interface EjercicioConProgreso {
  id_ejercicio: number;
  nombre: string;
  grupo_muscular: string;
  total_sesiones: number;
  peso_inicial: number | null;
  peso_actual: number | null;
  peso_maximo: number | null;
  progreso_total: number | null;
  porcentaje_mejora: number | null;
  ultima_sesion: string | null;
}

export interface RegistrarProgresoResponse {
  success: boolean;
  id_progreso: number;
  mensaje: string;
  record_personal: boolean;
}

export interface AnalizarProgresionResponse {
  success: boolean;
  alertas_generadas: number;
  mensaje: string;
}

export interface AtenderAlertaResponse {
  success: boolean;
  mensaje: string;
}

export interface CrearHistorialResponse {
  success: boolean;
  id_historial: number;
  mensaje: string;
}

export interface CompletarRutinaResponse {
  success: boolean;
  mensaje: string;
}

export interface CrearObjetivoRequest {
  id_cliente: number;
  id_ejercicio?: number;
  tipo_objetivo: string;
  titulo: string;
  descripcion?: string;
  valor_inicial?: number;
  valor_objetivo: number;
  unidad?: string;
  fecha_limite: string;
}

export interface CrearObjetivoResponse {
  success: boolean;
  id_objetivo: number;
  mensaje: string;
}

// ============================================================
// SERVICIO
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class ProgresoService {
  private apiUrl = `${environment.apiBase}/progresion`;

  constructor(private http: HttpClient) {}

  // ============================================================
  // DASHBOARD
  // ============================================================

  /**
   * ✅ Obtiene el dashboard completo del cliente
   */
  obtenerDashboardCliente(idCliente: number): Observable<DashboardCliente> {
    return this.http.get<DashboardCliente>(`${this.apiUrl}/dashboard/cliente/${idCliente}`);
  }

  // ============================================================
  // HISTORIAL DE RUTINAS
  // ============================================================

  /**
   * ✅ Obtiene el historial completo de rutinas
   */
  obtenerHistorialCliente(
    idCliente: number,
    limit: number = 30,
    offset: number = 0
  ): Observable<HistorialRutina[]> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());
    
    return this.http.get<HistorialRutina[]>(
      `${this.apiUrl}/historial/cliente/${idCliente}`,
      { params }
    );
  }

  /**
   * Crea un registro en el historial cuando se activa una rutina
   */
  crearHistorialRutina(
    idRutina: number,
    idCliente: number
  ): Observable<CrearHistorialResponse> {
    return this.http.post<CrearHistorialResponse>(
      `${this.apiUrl}/progresion/historial/crear`,
      null,
      { params: new HttpParams().set('id_rutina', idRutina).set('id_cliente', idCliente) }
    );
  }

  /**
   * Marca una rutina como completada
   */
  completarRutina(idHistorial: number): Observable<CompletarRutinaResponse> {
    return this.http.patch<CompletarRutinaResponse>(
      `${this.apiUrl}/historial/${idHistorial}/completar`,
      {}
    );
  }

  // ============================================================
  // EJERCICIOS CON PROGRESO
  // ============================================================

  /**
   * ✅ NUEVO: Obtiene ejercicios de una rutina con métricas de progreso
   */
  obtenerEjerciciosConProgreso(
    idHistorial: number,
    idCliente: number
  ): Observable<EjercicioConProgreso[]> {
    const params = new HttpParams().set('id_cliente', idCliente.toString());
    
    return this.http.get<EjercicioConProgreso[]>(
      `${this.apiUrl}/historial/${idHistorial}/ejercicios`,
      { params }
    );
  }

  /**
   * ✅ Obtiene el historial detallado de progreso de un ejercicio
   */
  obtenerProgresoEjercicio(
    idEjercicio: number,
    idCliente: number,
    limite: number = 50
  ): Observable<ProgresoEjercicio[]> {
    const params = new HttpParams().set('limite', limite.toString());
    
    return this.http.get<ProgresoEjercicio[]>(
      `${this.apiUrl}/ejercicio/${idEjercicio}/cliente/${idCliente}/progreso`,
      { params }
    );
  }

  /**
   * Obtiene estadísticas resumidas de progreso en un ejercicio
   */
  obtenerEstadisticasEjercicio(
    idEjercicio: number,
    idCliente: number
  ): Observable<EstadisticasProgreso> {
    return this.http.get<EstadisticasProgreso>(
      `${this.apiUrl}/ejercicio/${idEjercicio}/cliente/${idCliente}/estadisticas`
    );
  }

  // ============================================================
  // REGISTRO DE PROGRESO
  // ============================================================

  /**
   * ✅ Registra el progreso de un ejercicio en una sesión
   */
  registrarProgreso(progreso: RegistrarProgresoRequest): Observable<RegistrarProgresoResponse> {
    return this.http.post<RegistrarProgresoResponse>(`${this.apiUrl}/registrar`, progreso);
  }

  // ============================================================
  // ALERTAS
  // ============================================================

  /**
   * ✅ Obtiene todas las alertas del cliente
   */
  obtenerAlertasCliente(idCliente: number): Observable<AlertaProgresion[]> {
    return this.http.get<AlertaProgresion[]>(`${this.apiUrl}/alertas/cliente/${idCliente}`);
  }

  /**
   * ✅ Analiza la progresión y genera alertas automáticas
   */
  analizarProgresion(idCliente: number): Observable<AnalizarProgresionResponse> {
    return this.http.post<AnalizarProgresionResponse>(
      `${this.apiUrl}/alertas/analizar/${idCliente}`,
      {}
    );
  }

  /**
   * Marca una alerta como vista
   */
  marcarAlertaVista(idAlerta: number): Observable<AtenderAlertaResponse> {
    return this.http.patch<AtenderAlertaResponse>(
      `${this.apiUrl}/alertas/${idAlerta}/marcar-vista`,
      {}
    );
  }

  /**
   * Marca una alerta como atendida
   */
  atenderAlerta(idAlerta: number): Observable<AtenderAlertaResponse> {
    return this.http.patch<AtenderAlertaResponse>(
      `${this.apiUrl}/alertas/${idAlerta}/atender`,
      {}
    );
  }

  // ============================================================
  // OBJETIVOS
  // ============================================================

  /**
   * ✅ Obtiene todos los objetivos del cliente
   */
  obtenerObjetivosCliente(idCliente: number): Observable<ObjetivoCliente[]> {
    return this.http.get<ObjetivoCliente[]>(`${this.apiUrl}/objetivos/cliente/${idCliente}`);
  }

  /**
   * Crea un nuevo objetivo para el cliente
   */
  crearObjetivo(objetivo: CrearObjetivoRequest): Observable<CrearObjetivoResponse> {
    return this.http.post<CrearObjetivoResponse>(`${this.apiUrl}/objetivos`, objetivo);
  }

  /**
   * Actualiza un objetivo existente
   */
  actualizarObjetivo(
    idObjetivo: number,
    datos: Partial<CrearObjetivoRequest>
  ): Observable<any> {
    return this.http.patch(`${this.apiUrl}/objetivos/${idObjetivo}`, datos);
  }

  /**
   * Marca un objetivo como alcanzado
   */
  marcarObjetivoAlcanzado(idObjetivo: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/objetivos/${idObjetivo}/alcanzado`, {});
  }

  actualizarEstadoAlerta(idAlerta: number, accion: string): Observable<AtenderAlertaResponse> {
  const params = new HttpParams().set('accion', accion);
  
  return this.http.put<AtenderAlertaResponse>(
    `${this.apiUrl}/alertas/${idAlerta}/actualizar-estado`,
    {},
    { params }
  );
}


registrarSesion(
  idEjercicio: number,
  idCliente: number,
  idHistorial: number,
  datos: any
) {
  const params = new HttpParams()
    .set('id_cliente', idCliente)
    .set('id_historial', idHistorial)
    .set('peso_kg', datos.peso_kg)
    .set('series', datos.series_completadas)
    .set('repeticiones', datos.repeticiones_completadas)
    .set('rpe', datos.rpe)
    .set('calidad_tecnica', datos.calidad_tecnica)
    .set('notas', datos.notas || '');

  return this.http.post(
    `${this.apiUrl}/ejercicio/${idEjercicio}/registrar-sesion`,
    null,
    { params }
  );
}

generarAlertasAutomaticas(idCliente: number) {
  return this.http.post<any>(
    `${this.apiUrl}/alertas/generar-automatico/${idCliente}`,
    {}
  );
}


}




