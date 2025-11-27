import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
   * 
   * ✅ MEJORADO: Sin headers manuales - el interceptor agregará el token
   */
  obtenerAlumnos(): Observable<Alumno[]> {
    const idEntrenador = this.getIdEntrenadorFromStorage();
    
    if (!idEntrenador) {
      console.error('❌ obtenerAlumnos: id_entrenador no disponible');
      return new Observable(observer => {
        observer.error(new Error('id_entrenador requerido'));
      });
    }

    const url = `${this.apiBaseUrl}/cliente-entrenador/mis-clientes/${idEntrenador}`;
    
    console.log(`🔍 obtenerAlumnos: Llamando a ${url}`);
    
    return new Observable(observer => {
      this.http.get<any[]>(url)
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
    return this.http.get<Alumno>(`${this.apiBaseUrl}/usuarios/${id}`);
  }

  // ============================================================
  // 🔹 EJERCICIOS
  // ============================================================

  obtenerEjerciciosDb(): Observable<Ejercicio[]> {
    const url = `${this.apiBaseUrl}/ejercicios`;
    console.log(`🔍 obtenerEjerciciosDb: Llamando a ${url}`);
    return this.http.get<Ejercicio[]>(url);
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
    return this.http.get<Ejercicio[]>(`${this.apiBaseUrl}/ejercicios/grupo/${grupo}`);
  }

  obtenerEjerciciosPorDificultad(dificultad: string): Observable<Ejercicio[]> {
    return this.http.get<Ejercicio[]>(`${this.apiBaseUrl}/ejercicios/dificultad/${dificultad}`);
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

  /**
   * ✅ CORREGIDO: Sin headers manuales - interceptor agregará token
   */
  guardarRutina(rutina: Rutina): Observable<Rutina> {
    // Si viene desde IA, actualizar
    if (rutina.id_rutina && rutina.generada_por === "gemini") {
      return this.actualizarRutina(rutina.id_rutina, rutina);
    }

    // Si es manual → crear
    const url = `${this.apiBaseUrl}/rutinas`;
    console.log(`📤 guardarRutina: POST ${url}`);
    return this.http.post<Rutina>(url, rutina);
  }

  actualizarRutina(id: number, rutina: Rutina): Observable<Rutina> {
    const url = `${this.apiBaseUrl}/rutinas/${id}`;
    console.log(`📤 actualizarRutina: PUT ${url}`);
    return this.http.put<Rutina>(url, rutina);
  }

  obtenerRutinasAlumno(idAlumno: number): Observable<Rutina[]> {
    const url = `${this.apiBaseUrl}/rutinas/alumno/${idAlumno}`;
    console.log(`🔍 obtenerRutinasAlumno: GET ${url}`);
    return this.http.get<Rutina[]>(url);
  }

  obtenerDetalleRutina(idRutina: number): Observable<Rutina> {
    const url = `${this.apiBaseUrl}/rutinas/${idRutina}`;
    console.log(`🔍 obtenerDetalleRutina: GET ${url}`);
    return this.http.get<Rutina>(url);
  }

  eliminarRutina(idRutina: number): Observable<any> {
    const url = `${this.apiBaseUrl}/rutinas/${idRutina}`;
    console.log(`🗑️  eliminarRutina: DELETE ${url}`);
    return this.http.delete(url);
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

  private cargarEjercicios(): void {
    this.cargarEjerciciosDb();
  }
}