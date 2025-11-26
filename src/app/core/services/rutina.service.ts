import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

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
  // ✅ Base de la API - USA RAILWAY EN PRODUCCIÓN
  private apiUrl = (window as any).env?.apiUrl || 'https://web-production-03d9e.up.railway.app';
  private apiBaseUrl = `${this.apiUrl}/api`;
  private token = localStorage.getItem('token');

  private alumnoSeleccionadoSubject = new BehaviorSubject<Alumno | null>(null);
  private ejerciciosDb = new BehaviorSubject<Ejercicio[]>([]);

  public alumnoSeleccionado$ = this.alumnoSeleccionadoSubject.asObservable();
  ejerciciosDb$ = this.ejerciciosDb.asObservable();

  constructor(private http: HttpClient) {
    this.cargarEjercicios();
  }

  // ============================================================
  // 🔹 ALUMNOS
  // ============================================================

  obtenerAlumnos(): Observable<Alumno[]> {
    const headers = this.getHeaders();
    return new Observable(observer => {
      this.http.get<any[]>(`${this.apiBaseUrl}/cliente-entrenador/mis-clientes`, { headers })
        .subscribe({
          next: relaciones => {
            observer.next(relaciones.map(r => r.cliente));
            observer.complete();
          },
          error: err => observer.error(err)
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
    return this.http.get<Ejercicio[]>(`${this.apiBaseUrl}/ejercicios`, { headers });
  }

  private cargarEjerciciosDb(): void {
    this.obtenerEjerciciosDb().subscribe({
      next: ejercicios => this.ejerciciosDb.next(ejercicios),
      error: error => console.error('Error ejercicios:', error)
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

    return this.http.post(`${this.apiBaseUrl}/ia/generar-rutina`, body, { params });
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
    return this.http.get<Rutina[]>(`${this.apiBaseUrl}/rutinas/alumno/${idAlumno}`, { headers });
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