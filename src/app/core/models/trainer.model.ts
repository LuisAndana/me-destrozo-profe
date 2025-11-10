// src/app/core/models/trainer.model.ts

/**
 * ============================================================
 * TIPOS Y MODELOS PARA ENTRENADORES
 * ============================================================
 */

/* ===== TIPOS BÁSICOS ===== */

/**
 * Modalidades de entrenamiento disponibles
 */
export type Modalidad = 'Online' | 'Presencial';

/* ===== ITEMS DEL PERFIL ===== */

/**
 * Item de educación formal
 */
export interface ItemEdu {
  titulo?: string;
  institucion?: string;
  inicio?: string;
  fin?: string;
  descripcion?: string;
  evidenciaUrl?: string;
}

/**
 * Item de diploma o certificado
 */
export interface ItemDip {
  titulo?: string;
  institucion?: string;
  fecha?: string;
  evidenciaUrl?: string;
}

/**
 * Item de curso o capacitación
 */
export interface ItemCur {
  titulo?: string;
  institucion?: string;
  fecha?: string;
  evidenciaUrl?: string;
}

/**
 * Item de logro o reconocimiento
 */
export interface ItemLog {
  titulo?: string;
  anio?: string;
  descripcion?: string;
  evidenciaUrl?: string;
}

/* ===== PERFIL COMPLETO DEL ENTRENADOR ===== */

/**
 * Perfil completo del entrenador con toda su información profesional
 */
export interface PerfilEntrenador {
  /** Resumen o biografía profesional */
  resumen?: string;
  /** Especialidad principal */
  especialidad?: string;
  /** Lista de especialidades adicionales */
  especialidades?: string[];
  /** Años de experiencia */
  experiencia?: number;
  /** Certificaciones principales */
  certificaciones?: string;
  /** Modalidades de entrenamiento */
  modalidades?: Modalidad[];
  /** Ciudad donde trabaja */
  ciudad?: string;
  /** Precio por sesión */
  precio?: number;
  /** Historial de educación */
  educacion?: ItemEdu[];
  /** Diplomas y certificados */
  diplomas?: ItemDip[];
  /** Cursos y capacitaciones */
  cursos?: ItemCur[];
  /** Logros y reconocimientos */
  logros?: ItemLog[];
}

/* ===== LISTADO DE ENTRENADORES ===== */

/**
 * Datos básicos de un entrenador para listar
 */
export interface TrainerOut {
  id: number;
  nombre: string;
  especialidad: string;
  rating: number;
  precio_mensual: number;
  ciudad: string;
  pais?: string | null;
  experiencia: number;
  modalidades: Modalidad[];
  etiquetas: string[];
  foto_url?: string | null;
  whatsapp?: string | null;
  bio?: string | null;
}

/**
 * Facetas para filtrar entrenadores
 */
export interface TrainersFacets {
  especialidades: string[];
  ciudades: string[];
  modalidades: Modalidad[];
  precioMin?: number | null;
  precioMax?: number | null;
  ratingMax?: number | null;
}

/**
 * Respuesta del listado de entrenadores
 */
export interface TrainersResponse {
  items: TrainerOut[];
  total: number;
  page: number;
  pageSize: number;
  facets?: TrainersFacets | null;
}

/* ===== DETALLE DE ENTRENADOR ===== */

/**
 * Detalle completo de un entrenador con su perfil
 */
export interface TrainerDetail extends TrainerOut {
  email?: string | null;
  telefono?: string | null;
  perfil?: PerfilEntrenador | null;
}