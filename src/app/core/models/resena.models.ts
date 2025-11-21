// src/app/core/models/resena.models.ts
// Modelos para el sistema de reseñas (ratings y comentarios)

export interface ResenaCreate {
  id_entrenador: number;
  calificacion: number;      // 1-5
  comentario: string;
}

export interface ResenaUpdate {
  calificacion?: number;
  comentario?: string;
}

export interface ResenaOut {
  id_resena: number;
  id_alumno: number;
  id_entrenador: number;
  calificacion: number;      // 1-5
  comentario: string;
  fecha_resena: string;      // ISO datetime
  // Datos relacionados opcionales
  nombreAlumno?: string;
  fotoAlumno?: string;
}

export interface EstadisticasEntrenador {
  id_entrenador: number;
  promedio_calificacion: number;   // 0-5
  total_resenas: number;
  distribucion_calificaciones?: {
    [key: number]: number;         // Ej: { "5": 10, "4": 5, "3": 2 }
  };
}

// Interfaz para la respuesta de creación de reseña de prueba
export interface CrearResenasPruebaResponse {
  mensaje: string;
  entrenador: {
    id: number;
    nombre: string;
  };
  resenas_creadas: number;
  estadisticas_actualizadas: {
    promedio_calificacion: number;
    total_resenas: number;
  };
  primeras_resenas: Array<{
    id: number;
    alumno: string;
    calificacion: number;
    comentario: string;
  }>;
}