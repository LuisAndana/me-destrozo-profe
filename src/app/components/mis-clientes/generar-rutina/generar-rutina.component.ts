import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RutinaService, Alumno, Ejercicio, DiaRutina, RutinaGenerada } from '../../../core/services/rutina.service';
import { GuardarRutinaModalComponent } from '../guardar-clientes/guardar-rutina.modal.component';
import { EditarRutinaModalComponent } from './editar-rutina/editar-rutina.modal.component';

@Component({
  selector: 'app-generar-rutina',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GuardarRutinaModalComponent,
    EditarRutinaModalComponent
  ],
  templateUrl: './generar-rutina.component.html',
  styleUrls: ['./generar-rutina.component.css']
})
export class GenerarRutinaComponent implements OnInit {
  // Datos
  alumnos: Alumno[] = [];
  alumnoSeleccionado: Alumno | null = null;
  ejerciciosDisponibles: Ejercicio[] = [];
  
  // Formulario
  objetivos: string = '';
  diasPorSemana: number = 4;
  nivel: 'principiante' | 'intermedio' | 'avanzado' = 'intermedio';
  grupoMuscularFoco: string = 'general';
  
  // Estados
  cargandoAlumnos: boolean = false;
  cargandoRutina: boolean = false;
  rutinaGenerada: RutinaGenerada | null = null;
  mensajeError: string = '';
  mensajeExito: string = '';
  
  // Para mostrar ejercicios con estructura V3
  diaSeleccionado: number = 0;

  // Modales
  mostrarModalGuardar: boolean = false;
  mostrarModalEditar: boolean = false;
  rutinaEditando: RutinaGenerada | null = null;

  constructor(private rutinaService: RutinaService) {}

  ngOnInit(): void {
    this.cargarAlumnos();
    this.cargarEjercicios();
    this.suscribirseAlAlumnoSeleccionado();
  }

  /**
   * Cargar lista de alumnos
   */
  cargarAlumnos(): void {
    this.cargandoAlumnos = true;
    this.mensajeError = '';
    
    this.rutinaService.obtenerAlumnos().subscribe({
      next: (alumnos: Alumno[]) => {
        this.alumnos = alumnos;
        this.cargandoAlumnos = false;
        
        if (alumnos.length === 0) {
          this.mensajeError = 'No hay alumnos disponibles';
        }
      },
      error: (error: any) => {
        console.error('Error al cargar alumnos:', error);
        this.mensajeError = 'Error al cargar los alumnos. Verifica tu conexión.';
        this.cargandoAlumnos = false;
      }
    });
  }

  /**
   * Cargar ejercicios disponibles de la BD
   */
  cargarEjercicios(): void {
    this.rutinaService.obtenerEjerciciosDb().subscribe({
      next: (ejercicios: Ejercicio[]) => {
        this.ejerciciosDisponibles = ejercicios;
        console.log(`✅ Ejercicios cargados: ${ejercicios.length}`);
      },
      error: (error: any) => {
        console.error('Error al cargar ejercicios:', error);
        this.mensajeError = 'Error al cargar los ejercicios de la base de datos.';
      }
    });
  }

  /**
   * Suscribirse a cambios del alumno seleccionado
   */
  private suscribirseAlAlumnoSeleccionado(): void {
    this.rutinaService.alumnoSeleccionado$.subscribe((alumno: Alumno | null) => {
      this.alumnoSeleccionado = alumno;
    });
  }

  /**
   * Seleccionar un alumno
   */
  seleccionarAlumno(alumno: Alumno): void {
    this.rutinaService.seleccionarAlumno(alumno);
    this.alumnoSeleccionado = alumno;
    this.mensajeError = '';
    this.rutinaGenerada = null;
  }

  /**
   * Obtener nombre completo del alumno
   */
  getNombreAlumno(alumno: Alumno): string {
    return `${alumno.nombre} ${alumno.apellido}`;
  }

  /**
   * Obtener datos formateados del alumno seleccionado
   */
  getDatosAlumnoFormateados(): any {
    if (!this.alumnoSeleccionado) return null;
    return this.rutinaService.prepararDatosAlumno(this.alumnoSeleccionado);
  }

  /**
   * Validar formulario
   */
  formularioValido(): boolean {
    return (
      this.alumnoSeleccionado !== null &&
      this.objetivos.trim().length > 0 &&
      this.diasPorSemana > 0 &&
      this.nivel.length > 0
    );
  }

  /**
   * Generar rutina con IA - VERSIÓN V3
   */
  generarRutina(): void {
    if (!this.formularioValido() || !this.alumnoSeleccionado) {
      this.mensajeError = 'Por favor completa todos los campos y selecciona un alumno.';
      return;
    }

    this.cargandoRutina = true;
    this.mensajeError = '';
    this.mensajeExito = '';
    this.rutinaGenerada = null;
    this.diaSeleccionado = 0;

    const nivelNormalizado = this.nivel.toLowerCase();

    console.log('🚀 Generando rutina V3 con distribución inteligente:', {
      alumno: this.alumnoSeleccionado,
      objetivos: this.objetivos,
      dias: this.diasPorSemana,
      nivel: nivelNormalizado,
      ejerciciosDisponibles: this.ejerciciosDisponibles.length
    });

    this.rutinaService.generarRutinaIA(
      this.alumnoSeleccionado.id_usuario,
      this.objetivos,
      this.diasPorSemana,
      nivelNormalizado
    ).subscribe({
      next: (rutina: RutinaGenerada) => {
        this.rutinaGenerada = rutina;
        this.mensajeExito = '✓ Rutina generada exitosamente - Distribución inteligente activada';
        this.cargandoRutina = false;
        console.log('✅ Rutina V3 con estructura de días:', rutina);
      },
      error: (error: any) => {
        console.error('❌ Error al generar rutina:', error);
        this.mensajeError = error.error?.detail || 'Error al generar la rutina. Intenta de nuevo.';
        this.cargandoRutina = false;
      }
    });
  }

  /**
   * Cambiar día seleccionado
   */
  cambiarDia(indice: number): void {
    this.diaSeleccionado = indice;
  }

  /**
   * Obtener día actual
   */
  obtenerDiaActual(): DiaRutina | null {
    if (!this.rutinaGenerada) return null;
    if (!this.rutinaGenerada.dias) return null;
    if (this.diaSeleccionado >= this.rutinaGenerada.dias.length) return null;
    const dia = this.rutinaGenerada.dias[this.diaSeleccionado];
    return dia || null;
  }

  /**
   * Calcular tiempo estimado
   */
  calcularTiempoEstimado(ejercicios: Ejercicio[]): number {
    if (!ejercicios || ejercicios.length === 0) return 0;

    let tiempoTotal = 0;
    
    ejercicios.forEach((ej: Ejercicio) => {
      const series = ej.series || 3;
      const reps = ej.repeticiones || 10;
      const descanso = ej.descanso_segundos || 60;
      
      const tiempoEjercicio = (series * reps * 3) + (descanso * (series - 1));
      tiempoTotal += tiempoEjercicio;
    });

    return Math.ceil(tiempoTotal / 60);
  }

  /**
   * Abrir modal de guardar
   */
  abrirModalGuardar(): void {
    if (!this.rutinaGenerada) {
      this.mensajeError = 'No hay rutina para guardar.';
      return;
    }
    this.mostrarModalGuardar = true;
  }

  /**
   * Guardar rutina desde modal
   */
  guardarRutinaDesdeModal(datos: { nombre: string; descripcion: string }): void {
    if (!this.rutinaGenerada || !this.alumnoSeleccionado) {
      this.mensajeError = 'No hay rutina para guardar.';
      return;
    }

    this.cargandoRutina = true;
    this.mensajeError = '';

    const rutinaAGuardar = {
      id_cliente: this.alumnoSeleccionado.id_usuario,
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      objetivo: this.rutinaGenerada.objetivo,
      nivel: this.rutinaGenerada.nivel,
      dias_semana: this.rutinaGenerada.dias_semana,
      total_ejercicios: this.rutinaGenerada.total_ejercicios,
      minutos_aproximados: this.rutinaGenerada.minutos_aproximados,
      ejercicios: [],
      dias: this.rutinaGenerada.dias,
      grupo_muscular: this.rutinaGenerada.grupo_muscular,
      fecha_creacion: this.rutinaGenerada.fecha_creacion,
      generada_por: this.rutinaGenerada.generada_por
    };

    this.rutinaService.guardarRutina(rutinaAGuardar as any).subscribe({
      next: (rutina: any) => {
        this.mensajeExito = '✓ Rutina guardada correctamente';
        this.mostrarModalGuardar = false;
        this.cargandoRutina = false;
        console.log('✅ Rutina guardada:', rutina);
        
        setTimeout(() => {
          this.limpiarFormulario();
        }, 2000);
      },
      error: (error: any) => {
        console.error('Error al guardar rutina:', error);
        this.mensajeError = 'Error al guardar la rutina. Intenta de nuevo.';
        this.cargandoRutina = false;
      }
    });
  }

  /**
   * Abrir modal de editar
   */
  abrirModalEditar(): void {
    if (!this.rutinaGenerada) {
      this.mensajeError = 'No hay rutina para editar.';
      return;
    }
    this.rutinaEditando = JSON.parse(JSON.stringify(this.rutinaGenerada));
    this.mostrarModalEditar = true;
  }

  /**
   * Guardar cambios desde modal de editar
   */
  guardarCambiosEditar(rutinaEditada: RutinaGenerada): void {
    if (!rutinaEditada) {
      this.mensajeError = 'Error al editar la rutina.';
      return;
    }

    this.rutinaGenerada = rutinaEditada;
    this.mostrarModalEditar = false;
    this.mensajeExito = '✓ Rutina actualizada correctamente (cambios en local)';
    
    console.log('✅ Rutina editada:', this.rutinaGenerada);
  }

  /**
   * Descargar rutina como JSON
   */
  descargarRutina(formato: 'pdf' | 'json'): void {
    if (!this.rutinaGenerada) {
      this.mensajeError = 'No hay rutina para descargar.';
      return;
    }

    if (formato === 'json') {
      const dataStr = JSON.stringify(this.rutinaGenerada, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      this.descargarArchivo(
        dataBlob, 
        `rutina-${this.rutinaGenerada.nombre.replace(/\s+/g, '-')}.json`
      );
    }
  }

  /**
   * Helper para descargar archivos
   */
  private descargarArchivo(blob: Blob, nombre: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * Limpiar formulario
   */
  limpiarFormulario(): void {
    this.objetivos = '';
    this.diasPorSemana = 4;
    this.nivel = 'intermedio';
    this.grupoMuscularFoco = 'general';
    this.rutinaGenerada = null;
    this.alumnoSeleccionado = null;
    this.mensajeExito = '';
    this.mensajeError = '';
    this.diaSeleccionado = 0;
  }

  /**
   * Obtener ejercicios recomendados
   */
  obtenerEjerciciosRecomendados(): Ejercicio[] {
    if (this.ejerciciosDisponibles.length === 0) return [];
    
    return this.ejerciciosDisponibles.filter(
      (e: Ejercicio) => e.dificultad?.toLowerCase() === this.nivel.toLowerCase()
    );
  }

  /**
   * Obtener grupos musculares únicos
   */
  obtenerGruposMuscularesUnicos(): string[] {
    const grupos = new Set(this.ejerciciosDisponibles.map((e: Ejercicio) => e.grupo_muscular));
    return Array.from(grupos).filter((g: any) => g && g.length > 0);
  }
}