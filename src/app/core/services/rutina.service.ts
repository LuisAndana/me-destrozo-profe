import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

// ============================================================
// 🔹 INTERFACES EXPORTADAS (para usar en componentes)
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

export interface RutinaGenerada {
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
}

export interface Rutina extends RutinaGenerada {
  id_rutina?: number;
  ejercicios?: Ejercicio[];
}

@Injectable({
  providedIn: 'root'
})
export class RutinaService {
  private apiUrl = 'http://localhost:8000/api';
  private token = localStorage.getItem('token');
  private alumnoSeleccionadoSubject = new BehaviorSubject<Alumno | null>(null);
  private ejerciciosDb = new BehaviorSubject<Ejercicio[]>([]);

  public alumnoSeleccionado$ = this.alumnoSeleccionadoSubject.asObservable();
  ejerciciosDb$ = this.ejerciciosDb.asObservable();

  constructor(private http: HttpClient) {
    this.cargarEjercicios();
  }

  // ============================================================
  // 🔹 ALUMNOS (actualizado al nuevo backend)
  // ============================================================

  /**
   * Obtener lista de alumnos del entrenador actual
   * (usa el nuevo endpoint /cliente-entrenador/mis-clientes)
   */
  obtenerAlumnos(): Observable<Alumno[]> {
    const headers = this.getHeaders();
    return new Observable<Alumno[]>(observer => {
      this.http.get<any[]>(`${this.apiUrl}/cliente-entrenador/mis-clientes`, { headers })
        .subscribe({
          next: (relaciones) => {
            // El backend devuelve { cliente: {...}, fecha_contratacion, ... }
            const alumnos = relaciones.map(r => r.cliente);
            observer.next(alumnos);
            observer.complete();
          },
          error: (error) => observer.error(error)
        });
    });
  }

  /**
   * Obtener alumno específico por ID
   */
  obtenerAlumnoPorId(id: number): Observable<Alumno> {
    const headers = this.getHeaders();
    return this.http.get<Alumno>(`${this.apiUrl}/usuarios/${id}`, { headers });
  }

  // ============================================================
  // 🔹 EJERCICIOS
  // ============================================================

  /**
   * Obtener todos los ejercicios de la BD
   */
  obtenerEjerciciosDb(): Observable<Ejercicio[]> {
    const headers = this.getHeaders();
    return this.http.get<Ejercicio[]>(`${this.apiUrl}/ejercicios`, { headers });
  }

  /**
   * Cargar ejercicios internamente
   */
  private cargarEjerciciosDb(): void {
    this.obtenerEjerciciosDb().subscribe({
      next: (ejercicios) => this.ejerciciosDb.next(ejercicios),
      error: (error) => console.error('Error al cargar ejercicios:', error)
    });
  }

  /**
   * Obtener ejercicios por grupo muscular
   */
  obtenerEjerciciosPorGrupo(grupo: string): Observable<Ejercicio[]> {
    const headers = this.getHeaders();
    return this.http.get<Ejercicio[]>(`${this.apiUrl}/ejercicios/grupo/${grupo}`, { headers });
  }

  /**
   * Obtener ejercicios por dificultad
   */
  obtenerEjerciciosPorDificultad(dificultad: string): Observable<Ejercicio[]> {
    const headers = this.getHeaders();
    return this.http.get<Ejercicio[]>(`${this.apiUrl}/ejercicios/dificultad/${dificultad}`, { headers });
  }

  // ============================================================
  // 🔹 RUTINAS
  // ============================================================

  /**
   * Generar rutina con IA - Devuelve RutinaGenerada con estructura de días
   */
  generarRutinaIA(
    idAlumno: number,
    objetivos: string,
    dias: number,
    nivel: string
  ): Observable<RutinaGenerada> {
    const headers = this.getHeaders();
    const payload = {
      id_cliente: idAlumno,
      objetivos,
      dias,
      nivel,
      usar_ejercicios_db: true
    };
    return this.http.post<RutinaGenerada>(`${this.apiUrl}/ia/generar-rutina`, payload, { headers });
  }

  /**
   * Guardar rutina generada
   */
  guardarRutina(rutina: Rutina): Observable<Rutina> {
    const headers = this.getHeaders();
    return this.http.post<Rutina>(`${this.apiUrl}/rutinas`, rutina, { headers });
  }

  /**
   * Actualizar rutina existente
   */
  actualizarRutina(id: number, rutina: Rutina): Observable<Rutina> {
    const headers = this.getHeaders();
    return this.http.put<Rutina>(`${this.apiUrl}/rutinas/${id}`, rutina, { headers });
  }

  /**
   * Obtener rutinas de un alumno
   */
  obtenerRutinasAlumno(idAlumno: number): Observable<Rutina[]> {
    const headers = this.getHeaders();
    return this.http.get<Rutina[]>(`${this.apiUrl}/rutinas/alumno/${idAlumno}`, { headers });
  }

  /**
   * Eliminar rutina
   */
  eliminarRutina(idRutina: number): Observable<any> {
    const headers = this.getHeaders();
    return this.http.delete(`${this.apiUrl}/rutinas/${idRutina}`, { headers });
  }

  /**
   * Obtener detalle de rutina
   */
  obtenerDetalleRutina(idRutina: number): Observable<Rutina> {
    const headers = this.getHeaders();
    return this.http.get<Rutina>(`${this.apiUrl}/rutinas/${idRutina}`, { headers });
  }

  // ============================================================
  // 🔹 SELECCIÓN DE ALUMNO
  // ============================================================

  /**
   * Seleccionar un alumno
   */
  seleccionarAlumno(alumno: Alumno): void {
    this.alumnoSeleccionadoSubject.next(alumno);
  }

  /**
   * Obtener alumno seleccionado actualmente
   */
  obtenerAlumnoSeleccionado(): Alumno | null {
    return this.alumnoSeleccionadoSubject.value;
  }

  /**
   * Obtener ejercicios cargados
   */
  obtenerEjerciciosCargados(): Ejercicio[] {
    return this.ejerciciosDb.value;
  }

  /**
   * Preparar datos del alumno formateados
   */
  prepararDatosAlumno(alumno: Alumno): any {
    return {
      id_usuario: alumno.id_usuario,
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      edad: alumno.edad || 30,
      peso: alumno.peso || 70,
      altura: alumno.altura || 170,
      imc: alumno.imc || this.calcularIMC(alumno.peso || 70, alumno.altura || 170)
    };
  }

  /**
   * Calcular IMC
   */
  private calcularIMC(peso: number, altura: number): number {
    const alturaEnMetros = altura / 100;
    return Math.round((peso / (alturaEnMetros * alturaEnMetros)) * 100) / 100;
  }

  // ============================================================
  // 🔹 HELPERS
  // ============================================================

  /**
   * Obtener headers con token de autenticación
   */
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Cargar ejercicios al inicializar el servicio
   */
  private cargarEjercicios(): void {
    this.cargarEjerciciosDb();
  }
}