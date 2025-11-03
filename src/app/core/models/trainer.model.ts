export type Modalidad = 'Online' | 'Presencial';

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

export interface TrainersFacets {
  especialidades: string[];
  ciudades: string[];
  modalidades: Modalidad[];
  precioMin: number | null;
  precioMax: number | null;
  ratingMax: number | null;
}

export interface TrainersResponse {
  items: TrainerOut[];
  total: number;
  page: number;
  pageSize: number;
  facets?: TrainersFacets | null;
}

/* ===== Detalle / Perfil ===== */
export interface ItemEdu { titulo?: string; institucion?: string; inicio?: string; fin?: string; descripcion?: string; evidenciaUrl?: string; }
export interface ItemDip { titulo?: string; institucion?: string; fecha?: string; evidenciaUrl?: string; }
export interface ItemCur { titulo?: string; institucion?: string; fecha?: string; evidenciaUrl?: string; }
export interface ItemLog { titulo?: string; anio?: string; descripcion?: string; evidenciaUrl?: string; }

export interface PerfilEntrenador {
  resumen?: string;
  educacion?: ItemEdu[];
  diplomas?: ItemDip[];
  cursos?: ItemCur[];
  logros?: ItemLog[];
}

export interface TrainerDetail extends TrainerOut {
  email?: string | null;
  telefono?: string | null;
  perfil?: PerfilEntrenador | null;
}
