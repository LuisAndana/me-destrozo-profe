// src/app/core/models/cliente.models.ts

 export type Sexo = 'Masculino' | 'Femenino' | 'Otro';

export interface UserProfile {
  id: number;
  nombre?: string | null;
  apellido?: string | null;
  email: string;
  rol: string;
  sexo?: Sexo | null;
  edad?: number | null;
  pesoKg?: number | null;
  estaturaCm?: number | null;
  imc?: number | null;
  problemas?: string | null;
  // el backend devuelve string (CSV); el front puede mapearlo a array si quiere
  enfermedades?: string | null;
  fotoUrl?: string | null;
  updatedAt?: string | null;
}

export interface UpdatePerfilBody {
  nombre?: string;
  apellido?: string;
  sexo?: Sexo;
  edad?: number;
  pesoKg?: number;
  estaturaCm?: number;
  problemas?: string;
  enfermedades?: string; // envía CSV; si tienes array, haz .join(',') antes
  imc?: number;
}

export interface CambioPerfil {
  id: number;
  fecha: string;  // ISO
  campo: string;  // 'pesoKg', 'estaturaCm', etc
  antes: string | number | null;
  despues: string | number | null;
}

export interface RutinaItem {
  nombre: string;
  duracionMin: number;
}

export interface RutinaHoy {
  totalMin: number;
  bloques: RutinaItem[];
}

export interface ProgresoSemanal {
  porcentaje: number;           // 0..100
  sesionesCompletadas: number;  // p.ej. 5
  objetivoSemanal: number;      // p.ej. 7
}

export interface Mensaje {
  id: number;
  asunto: string;
  resumen: string;
  fecha: string;    // ISO 8601 (yyyy-mm-ddTHH:mm:ssZ)
  leido: boolean;
}

export interface BandejaMensajes {
  nuevos: number;       // cantidad de no leídos
  mensajes: Mensaje[];  // últimos N mensajes
}

export interface RutinaItem { nombre: string; duracionMin: number; }
export interface RutinaHoy { totalMin: number; bloques: RutinaItem[]; }
export interface ProgresoSemanal { porcentaje: number; sesionesCompletadas: number; objetivoSemanal: number; }
export interface Mensaje { id: number; asunto: string; resumen: string; fecha: string; leido: boolean; }
export interface BandejaMensajes { nuevos: number; mensajes: Mensaje[]; }

// Historial (estructura flexible del backend)
export interface CambioPerfil {
  fecha: string;                     // ISO
  cambios: Record<string, unknown>;  // p.ej. { pesoKg: "78.2 → 79.4" }
}