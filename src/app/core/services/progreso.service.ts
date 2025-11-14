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

export interface DashboardCliente {
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
  // REGISTRO DE PROGRESO
  // ============================================================

  /**
   * Registra el progreso de un ejercicio en una sesión
   */
  registrarProgreso(progreso: RegistrarProgresoRequest): Observable<RegistrarProgresoResponse> {
    return this.http.post<RegistrarProgresoResponse>(`${this.apiUrl}/registrar`, progreso);
  }

  /**
   * Obtiene el historial de progreso de un ejercicio para un cliente
   */
  obtenerProgresoEjercicio(
    idEjercicio: number,
    idCliente: number,
    limite: number = 50
  ): Observable<ProgresoEjercicio[]> {
    const params = new HttpParams().set('limite', limite.toString());
    return this.http.get<ProgresoEjercicio[]>(
      `${this.apiUrl}/ejercicio/${idEjercicio}/cliente/${idCliente}`,
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
  // HISTORIAL DE RUTINAS
  // ============================================================

  /**
   * Crea un registro en el historial cuando se activa una rutina
   */
  crearHistorialRutina(
    idRutina: number,
    fechaInicio?: Date
  ): Observable<CrearHistorialResponse> {
    const body: any = { id_rutina: idRutina };
    if (fechaInicio) {
      body.fecha_inicio = fechaInicio.toISOString();
    }
    return this.http.post<CrearHistorialResponse>(`${this.apiUrl}/historial/crear`, body);
  }

  /**
   * Obtiene el historial completo de rutinas de un cliente
   */
  obtenerHistorialCliente(idCliente: number): Observable<HistorialRutina[]> {
    return this.http.get<HistorialRutina[]>(`${this.apiUrl}/historial/cliente/${idCliente}`);
  }

  /**
   * Marca una rutina como completada y registra métricas finales
   */
  completarRutina(
    idHistorial: number,
    pesoFinal?: number,
    grasaCorporalFinal?: number,
    notasEntrenador?: string
  ): Observable<CompletarRutinaResponse> {
    const body: any = {};
    if (pesoFinal !== undefined) body.peso_final = pesoFinal;
    if (grasaCorporalFinal !== undefined) body.grasa_corporal_final = grasaCorporalFinal;
    if (notasEntrenador) body.notas_entrenador = notasEntrenador;

    return this.http.put<CompletarRutinaResponse>(
      `${this.apiUrl}/historial/${idHistorial}/completar`,
      body
    );
  }

  // ============================================================
  // ALERTAS
  // ============================================================

  /**
   * Obtiene las alertas de progresión de un cliente
   */
  obtenerAlertasCliente(
    idCliente: number,
    estado?: 'pendiente' | 'vista' | 'atendida' | 'descartada'
  ): Observable<AlertaProgresion[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<AlertaProgresion[]>(
      `${this.apiUrl}/alertas/cliente/${idCliente}`,
      { params }
    );
  }

  /**
   * Analiza la progresión del cliente y genera alertas automáticas
   */
  analizarProgresion(idCliente: number): Observable<AnalizarProgresionResponse> {
    return this.http.post<AnalizarProgresionResponse>(
      `${this.apiUrl}/alertas/analizar/${idCliente}`,
      {}
    );
  }

  /**
   * Marca una alerta como atendida
   */
  atenderAlerta(
    idAlerta: number,
    idEntrenador: number,
    accionTomada?: string
  ): Observable<AtenderAlertaResponse> {
    const body: any = { id_entrenador: idEntrenador };
    if (accionTomada) body.accion_tomada = accionTomada;

    return this.http.put<AtenderAlertaResponse>(
      `${this.apiUrl}/alertas/${idAlerta}/atender`,
      body
    );
  }

  // ============================================================
  // OBJETIVOS
  // ============================================================

  /**
   * Crea un nuevo objetivo para un cliente
   */
  crearObjetivo(objetivo: CrearObjetivoRequest): Observable<CrearObjetivoResponse> {
    return this.http.post<CrearObjetivoResponse>(`${this.apiUrl}/objetivos/crear`, objetivo);
  }

  /**
   * Obtiene los objetivos de un cliente
   */
  obtenerObjetivosCliente(idCliente: number): Observable<ObjetivoCliente[]> {
    return this.http.get<ObjetivoCliente[]>(`${this.apiUrl}/objetivos/cliente/${idCliente}`);
  }

  // ============================================================
  // DASHBOARD
  // ============================================================

  /**
   * Obtiene un resumen completo del progreso del cliente para dashboard
   */
  obtenerDashboardCliente(idCliente: number): Observable<DashboardCliente> {
    return this.http.get<DashboardCliente>(`${this.apiUrl}/dashboard/cliente/${idCliente}`);
  }
}