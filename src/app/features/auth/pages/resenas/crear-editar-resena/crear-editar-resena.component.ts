// src/app/components/resenas/crear-editar-resena/crear-editar-resena.component.ts
// Componente para crear o editar una reseña de entrenador

import { Component, OnInit, OnDestroy, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ResenaService } from '../../../../../core/services/resena.service';
import { ResenaOut, ResenaCreate, ResenaUpdate } from '../../../../../core/models/resena.models';

@Component({
  selector: 'app-crear-editar-resena',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './crear-editar-resena.component.html',
  styleUrls: ['./crear-editar-resena.component.css']
})
export class CrearEditarResenaComponent implements OnInit, OnDestroy {
  @Input() idEntrenador!: number;
  @Input() nombreEntrenador: string = 'Entrenador';
  @Input() resenaExistente: ResenaOut | null = null;
  @Output() resenaGuardada = new EventEmitter<ResenaOut>();
  @Output() cancelado = new EventEmitter<void>();

  private resenaService = inject(ResenaService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  // Estado del formulario
  formulario!: FormGroup;
  cargando = false;
  error: string | null = null;
  exito: string | null = null;
  modo: 'crear' | 'editar' = 'crear';

  // Usuario actual
  idUsuarioActual!: number;

  // Validación de campos
  mostrarErrores = false;

  // Controles de UI
  calificacionHover = 0;
  caracteresRestantes = 500;

  ngOnInit(): void {
    this.obtenerIdUsuario();
    this.inicializarFormulario();

    if (this.resenaExistente) {
      this.modo = 'editar';
      this.cargarDatosExistentes();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Obtener el ID del usuario actual desde localStorage
   */
  private obtenerIdUsuario(): void {
    try {
      const usuarioJson = localStorage.getItem('usuario');
      if (usuarioJson) {
        const usuario = JSON.parse(usuarioJson);
        this.idUsuarioActual = usuario.id || usuario.id_usuario;
      }
    } catch (e) {
      console.error('Error obteniendo usuario:', e);
      this.error = 'Error: No se pudo identificar el usuario';
    }
  }

  /**
   * Inicializar el formulario reactivo
   */
  private inicializarFormulario(): void {
    this.formulario = this.fb.group({
      calificacion: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
      comentario: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]]
    });

    // Actualizar caracteres restantes cuando cambie el comentario
    this.formulario.get('comentario')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(valor => {
        this.caracteresRestantes = 500 - (valor?.length || 0);
      });
  }

  /**
   * Cargar datos de la reseña existente
   */
  private cargarDatosExistentes(): void {
    if (this.resenaExistente) {
      this.formulario.patchValue({
        calificacion: this.resenaExistente.calificacion,
        comentario: this.resenaExistente.comentario
      });
      this.caracteresRestantes = 500 - this.resenaExistente.comentario.length;
    }
  }

  /**
   * Manejar hover en las estrellas
   */
  onStarHover(valor: number): void {
    this.calificacionHover = valor;
  }

  /**
   * Salir del hover
   */
  onStarLeave(): void {
    this.calificacionHover = 0;
  }

  /**
   * Seleccionar calificación
   */
  selectCalificacion(valor: number): void {
    this.formulario.patchValue({ calificacion: valor });
  }

  /**
   * Obtener el array de estrellas (1-5)
   */
  get estrellas(): number[] {
    return [1, 2, 3, 4, 5];
  }

  /**
   * Verificar si la calificación tiene error
   */
  get calificacionInvalida(): boolean {
    const control = this.formulario.get('calificacion');
    return !!(control && control.invalid && (control.dirty || control.touched || this.mostrarErrores));
  }

  /**
   * Verificar si el comentario tiene error
   */
  get comentarioInvalido(): boolean {
    const control = this.formulario.get('comentario');
    return !!(control && control.invalid && (control.dirty || control.touched || this.mostrarErrores));
  }

  /**
   * Enviar formulario
   */
  enviar(): void {
    this.error = null;
    this.exito = null;
    this.mostrarErrores = true;

    if (this.formulario.invalid) {
      this.error = 'Por favor, completa todos los campos correctamente';
      return;
    }

    this.cargando = true;

    if (this.modo === 'crear') {
      this.crearResena();
    } else {
      this.actualizarResena();
    }
  }

  /**
   * Crear una nueva reseña
   */
  private crearResena(): void {
    const payload: ResenaCreate = {
      id_entrenador: this.idEntrenador,
      calificacion: this.formulario.get('calificacion')?.value,
      comentario: this.formulario.get('comentario')?.value
    };

    this.resenaService.crearResena(this.idUsuarioActual, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resena) => {
          this.exito = `¡Reseña creada exitosamente! Calificación: ${resena.calificacion}/5`;
          this.cargando = false;
          setTimeout(() => {
            this.resenaGuardada.emit(resena);
          }, 1000);
        },
        error: (err) => {
          this.cargando = false;
          this.manejarError(err);
        }
      });
  }

  /**
   * Actualizar una reseña existente
   */
  private actualizarResena(): void {
    if (!this.resenaExistente) return;

    const payload: ResenaUpdate = {
      calificacion: this.formulario.get('calificacion')?.value,
      comentario: this.formulario.get('comentario')?.value
    };

    this.resenaService.actualizarResena(
      this.resenaExistente.id_resena,
      this.idUsuarioActual,
      payload
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resena) => {
          this.exito = '¡Reseña actualizada exitosamente!';
          this.cargando = false;
          setTimeout(() => {
            this.resenaGuardada.emit(resena);
          }, 1000);
        },
        error: (err) => {
          this.cargando = false;
          this.manejarError(err);
        }
      });
  }

  /**
   * Cancelar la operación
   */
  cancelar(): void {
    this.cancelado.emit();
  }

  /**
   * Manejar errores
   */
  private manejarError(err: any): void {
    console.error('Error:', err);

    if (err.status === 409) {
      this.error = 'Ya has calificado a este entrenador. Puedes editar tu reseña.';
    } else if (err.status === 403) {
      this.error = 'No tienes permiso para realizar esta acción';
    } else if (err.status === 404) {
      this.error = 'El entrenador no fue encontrado';
    } else if (err.error?.detail) {
      this.error = err.error.detail;
    } else {
      this.error = 'Error al guardar la reseña. Intenta nuevamente.';
    }
  }

  /**
   * Obtener descripción de calificación
   */
  getDescripcionCalificacion(valor: number): string {
    const descripciones: { [key: number]: string } = {
      1: 'Malo',
      2: 'Regular',
      3: 'Bueno',
      4: 'Muy Bueno',
      5: 'Excelente'
    };
    return descripciones[valor] || '';
  }
}