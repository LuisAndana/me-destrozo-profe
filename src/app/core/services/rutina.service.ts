import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

// ============================================================
// 🔹 INTERFACES
// ============================================================

export interface Alumno {
  id_usuario: number;
  nombre: string;
  apellido: string;
  email: string;
  edad?: number;
  peso?: number;
  altura?: number;
  imc?: number;
}

export interface Ejercicio {
  id_ejercicio: number;
  nombre: string;
  descripcion: string;
  grupo_muscular: string;
  dificultad: string;
  tipo: string;
  repeticiones?: number;
  series?: number;
  descanso_segundos?: number;
  notas?: string;
}

export interface DiaRutina {
  numero_dia: number;
  nombre_dia: string;
  descripcion: string;
  grupos_enfoque: string[];
  ejercicios: Ejercicio[];
}

export interface VigenciaRutina {
  duracion_meses: number;
  duracion_dias: number;
  fecha_inicio: string;
  fecha_fin: string;
  dias_restantes: number;
  estado: 'activa' | 'por_vencer' | 'vencida' | 'pendiente';
  porcentaje_completado: number;
  activada: boolean;
}

export interface RutinaGenerada {
  id_rutina?: number;
  nombre: string;
  descripcion: string;
  id_cliente: number;
  objetivo: string;
  grupo_muscular: string;
  nivel: string;
  dias_semana: number;
  total_ejercicios: number;
  minutos_aproximados: number;
  dias: DiaRutina[];
  fecha_creacion: string;
  generada_por: string;
  vigencia?: VigenciaRutina;
}

export interface Rutina extends RutinaGenerada {
  id_rutina?: number;
  ejercicios?: Ejercicio[];
}

// ============================================================
// 🔹 SERVICE
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class RutinaService {
  // ✅ Base de la API - USA ENVIRONMENT (HTTPS EN PROD, HTTP EN DEV)
  private apiBaseUrl = `${environment.apiBase}/api`;
  private token = localStorage.getItem('token');

  private alumnoSeleccionadoSubject = new BehaviorSubject<Alumno | null>(null);
  private ejerciciosDb = new BehaviorSubject<Ejercicio[]>([]);

  public alumnoSeleccionado$ = this.alumnoSeleccionadoSubject.asObservable();
  ejerciciosDb$ = this.ejerciciosDb.asObservable();

  constructor(private http: HttpClient) {
    console.log(`🔧 RutinaService: apiBaseUrl = ${this.apiBaseUrl}`);
    this.cargarEjercicios();
  }

  // ============================================================
  // 🔹 HELPER: Obtener ID del entrenador
  // ============================================================
  private getIdEntrenadorFromStorage(): number {
    const raw = localStorage.getItem('id_entrenador') || '';
    const id = parseInt(raw, 10);
    if (id > 0) {
      console.log(`✅ RutinaService: id_entrenador encontrado = ${id}`);
      return id;
    }
    try {
      const user = JSON.parse(localStorage.getItem('usuario') || 'null');
      if (user?.id && (user.rol === 'entrenador' || user.rol === 'trainer')) {
        console.log(`✅ RutinaService: id_entrenador extraído de usuario = ${user.id}`);
        return Number(user.id) || 0;
      }
    } catch (e) {
      console.error('❌ RutinaService: Error parseando usuario de storage', e);
    }
    console.warn('⚠️ RutinaService: No se pudo obtener id_entrenador');
    return 0;
  }

  // ============================================================
  // 🔹 ALUMNOS
  // ============================================================

  /**
   * ✅ CORREGIDO: Obtiene alumnos del entrenador actual
   * GET /api/cliente-entrenador/mis-clientes/{id_entrenador}
   */
  obtenerAlumnos(): Observable<Alumno[]> {
    const idEntrenador = this.getIdEntrenadorFromStorage();
    
    if (!idEntrenador) {
      console.error('❌ obtenerAlumnos: id_entrenador no disponible');
      return new Observable(observer => {
        observer.error(new Error('id_entrenador requerido'));
      });
    }

    const headers = this.getHeaders();
    const url = `${this.apiBaseUrl}/cliente-entrenador/mis-clientes/${idEntrenador}`;
    
    console.log(`🔍 obtenerAlumnos: Llamando a ${url}`);
    
    return new Observable(observer => {
      this.http.get<any[]>(url, { headers })
        .subscribe({
          next: relaciones => {
            const alumnos = relaciones.map(r => r.cliente);
            console.log(`✅ obtenerAlumnos: ${alumnos.length} alumnos cargados`);
            observer.next(alumnos);
            observer.complete();
          },
          error: err => {
            console.error(`❌ obtenerAlumnos: Error`, err);
            observer.error(err);
          }
        });
    });
  }

  obtenerAlumnoPorId(id: number): Observable<Alumno> {
    const headers = this.getHeaders();
    return this.http.get<Alumno>(`${this.apiBaseUrl}/usuarios/${id}`, { headers });
  }

  // ============================================================
  // 🔹 EJERCICIOS
  // ============================================================

  obtenerEjerciciosDb(): Observable<Ejercicio[]> {
    const headers = this.getHeaders();
    const url = `${this.apiBaseUrl}/ejercicios`;
    console.log(`🔍 obtenerEjerciciosDb: Llamando a ${url}`);
    return this.http.get<Ejercicio[]>(url, { headers });
  }

  private cargarEjerciciosDb(): void {
    this.obtenerEjerciciosDb().subscribe({
      next: ejercicios => {
        console.log(`✅ cargarEjerciciosDb: ${ejercicios.length} ejercicios cargados`);
        this.ejerciciosDb.next(ejercicios);
      },
      error: error => console.error('❌ Error cargando ejercicios:', error)
    });
  }

  obtenerEjerciciosPorGrupo(grupo: string): Observable<Ejercicio[]> {
    const headers = this.getHeaders();
    return this.http.get<Ejercicio[]>(`${this.apiBaseUrl}/ejercicios/grupo/${grupo}`, { headers });
  }

  obtenerEjerciciosPorDificultad(dificultad: string): Observable<Ejercicio[]> {
    const headers = this.getHeaders();
    return this.http.get<Ejercicio[]>(`${this.apiBaseUrl}/ejercicios/dificultad/${dificultad}`, { headers });
  }

  // ============================================================
  // 🔹 RUTINAS IA
  // ============================================================

  generarRutinaIA(
    idCliente: number,
    objetivos: string,
    dias: number,
    nivel: string,
    duracionMeses = 1,
    activarVigencia = true
  ): Observable<any> {
    const body = {
      id_cliente: idCliente,
      objetivos,
      dias,
      nivel,
      grupo_muscular_foco: "general",
      duracion_meses: duracionMeses,
      proveedor: "auto"
    };

    const params = activarVigencia
      ? new HttpParams().set("activar_vigencia", "true")
      : new HttpParams();

    const url = `${this.apiBaseUrl}/ia/generar-rutina`;
    console.log(`🔍 generarRutinaIA: Llamando a ${url}`);

    return this.http.post(url, body, { params });
  }

  // ============================================================
  // 🔹 GUARDAR / ACTUALIZAR RUTINA
  // ============================================================

  guardarRutina(rutina: Rutina): Observable<Rutina> {
    const headers = this.getHeaders();

    // Si viene desde IA, actualizar
    if (rutina.id_rutina && rutina.generada_por === "gemini") {
      return this.actualizarRutina(rutina.id_rutina, rutina);
    }

    // Si es manual → crear
    return this.http.post<Rutina>(`${this.apiBaseUrl}/rutinas`, rutina, { headers });
  }

  actualizarRutina(id: number, rutina: Rutina): Observable<Rutina> {
    const headers = this.getHeaders();
    return this.http.put<Rutina>(`${this.apiBaseUrl}/rutinas/${id}`, rutina, { headers });
  }

  obtenerRutinasAlumno(idAlumno: number): Observable<Rutina[]> {
    const headers = this.getHeaders();
    const url = `${this.apiBaseUrl}/rutinas/alumno/${idAlumno}`;
    console.log(`🔍 obtenerRutinasAlumno: Llamando a ${url}`);
    return this.http.get<Rutina[]>(url, { headers });
  }

  obtenerDetalleRutina(idRutina: number): Observable<Rutina> {
    const headers = this.getHeaders();
    return this.http.get<Rutina>(`${this.apiBaseUrl}/rutinas/${idRutina}`, { headers });
  }

  eliminarRutina(idRutina: number): Observable<any> {
    const headers = this.getHeaders();
    return this.http.delete(`${this.apiBaseUrl}/rutinas/${idRutina}`, { headers });
  }

  // ============================================================
  // 🔹 AUXILIARES
  // ============================================================

  private contarEjercicios(rutina: Rutina): number {
    if (!rutina.dias) return 0;
    return rutina.dias.reduce(
      (t, d) => t + (d.ejercicios?.length ?? 0),
      0
    );
  }

  seleccionarAlumno(a: Alumno): void {
    this.alumnoSeleccionadoSubject.next(a);
  }

  obtenerAlumnoSeleccionado(): Alumno | null {
    return this.alumnoSeleccionadoSubject.value;
  }

  obtenerEjerciciosCargados(): Ejercicio[] {
    return this.ejerciciosDb.value;
  }

  prepararDatosAlumno(a: Alumno): any {
    return {
      id_usuario: a.id_usuario,
      nombre: a.nombre,
      apellido: a.apellido,
      edad: a.edad ?? 30,
      peso: a.peso ?? 70,
      altura: a.altura ?? 170,
      imc: a.imc ?? this.calcularIMC(a.peso ?? 70, a.altura ?? 170)
    };
  }

  private calcularIMC(p: number, a: number): number {
    const m = a / 100;
    return Math.round((p / (m * m)) * 100) / 100;
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json"
    });
  }

  private cargarEjercicios(): void {
    this.cargarEjerciciosDb();
  }
}