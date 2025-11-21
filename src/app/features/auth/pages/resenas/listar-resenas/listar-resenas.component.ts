// src/app/components/resenas/listar-resenas/listar-resenas.component.ts
// Componente para mostrar todas las reseñas de un entrenador

import { Component, OnInit, OnDestroy, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ResenaService } from '../../../../../core/services/resena.service';
import { ResenaOut, EstadisticasEntrenador } from '../../../../../core/models/resena.models';

@Component({
  selector: 'app-listar-resenas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './listar-resenas.component.html',
  
})
export class ListarResenasComponent implements OnInit, OnDestroy {
  @Input() idEntrenador!: number;
  @Input() limit: number = 10;

  private resenaService = inject(ResenaService);
  private destroy$ = new Subject<void>();

  // Datos
  resenas: ResenaOut[] = [];
  estadisticas: EstadisticasEntrenador | null = null;

  // Estado
  cargando = true;
  error: string | null = null;
  paginaActual = 1;
  itemsPorPagina = 5;

  ngOnInit(): void {
    this.cargarResenasYEstadisticas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cargar reseñas y estadísticas del entrenador
   */
  private cargarResenasYEstadisticas(): void {
    this.cargando = true;
    this.error = null;

    // Cargar reseñas
    this.resenaService.obtenerResenasEntrenador(this.idEntrenador, this.limit)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resenas) => {
          this.resenas = resenas;
        },
        error: (err) => {
          console.error('Error cargando reseñas:', err);
          this.error = 'No se pudieron cargar las reseñas';
          this.cargando = false;
        }
      });

    // Cargar estadísticas
    this.resenaService.obtenerEstadisticasEntrenador(this.idEntrenador)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.estadisticas = stats;
          this.cargando = false;
        },
        error: (err) => {
          console.error('Error cargando estadísticas:', err);
          this.cargando = false;
        }
      });
  }

  /**
   * Obtener reseñas paginadas
   */
  get resenasPaginadas(): ResenaOut[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return this.resenas.slice(inicio, fin);
  }

  /**
   * Obtener total de páginas
   */
  get totalPaginas(): number {
    return Math.ceil(this.resenas.length / this.itemsPorPagina);
  }

  /**
   * Navegar a página anterior
   */
  paginaAnterior(): void {
    if (this.paginaActual > 1) {
      this.paginaActual--;
    }
  }

  /**
   * Navegar a página siguiente
   */
  paginaSiguiente(): void {
    if (this.paginaActual < this.totalPaginas) {
      this.paginaActual++;
    }
  }

  /**
   * Obtener el color basado en la calificación
   */
  getColorCalificacion(calificacion: number): string {
    if (calificacion >= 4.5) return '#22c55e';  // Verde
    if (calificacion >= 3.5) return '#fbbf24';  // Amarillo
    if (calificacion >= 2.5) return '#f97316';  // Naranja
    return '#ef4444';  // Rojo
  }

  /**
   * Obtener estrellas para mostrar calificación
   */
  getStars(calificacion: number): string {
    const fullStars = Math.floor(calificacion);
    const hasHalf = calificacion % 1 !== 0;
    let stars = '★'.repeat(fullStars);
    if (hasHalf) stars += '½';
    stars += '☆'.repeat(5 - Math.ceil(calificacion));
    return stars;
  }

  /**
   * Formatear fecha
   */
  /**
 * Formatear fecha
 */
formatearFecha(fecha: string | Date): string {
  try {
    if (!fecha) return 'Fecha no disponible';
    
    // Si es string, convertir a Date
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    
    // Validar que sea una fecha válida
    if (isNaN(date.getTime())) {
      console.warn('Fecha inválida:', fecha);
      return 'Fecha no disponible';
    }
    
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formateando fecha:', error, fecha);
    return 'Fecha no disponible';
  }
}

  /**
   * Truncar texto
   */
  truncarTexto(texto: string, length: number = 150): string {
    if (texto.length <= length) return texto;
    return texto.substring(0, length) + '...';
  }
}