// src/app/core/models/mensaje.models.ts

/**
 * Modelo de mensaje individual
 */

export interface ClienteOut {
  id_usuario: number;
  nombre: string;
  apellido?: string;   // <-- AGREGA ESTO
  email?: string;
  foto_url?: string;
  
}
export interface Mensaje {
  id_mensaje: number;
  id_remitente: number;
  id_destinatario: number;
  contenido: string;
  fecha_envio: string;  // ISO 8601
  leido: boolean;
  fecha_lectura?: string | null;
}

/**
 * Información del usuario en conversaciones
 */
export interface UsuarioConversacion {
  id_usuario: number;
  nombre: string;
  apellido?: string; 
  foto_url?: string;
  email?: string;
  rol?: string;
}

/**
 * Conversación con el otro usuario
 */
export interface Conversacion {
  otro_usuario: UsuarioConversacion;
  ultimo_mensaje: {
    contenido: string;
    fecha_envio: string;
    leido: boolean;
    es_remitente: boolean;  // true si el usuario actual envió el mensaje
  };
  mensajes_no_leidos: number;
}

/**
 * Historial de mensajes de una conversación
 */
export interface HistorialMensajes {
  mensajes: Mensaje[];
  total: number;
}

/**
 * Payload para crear un mensaje
 */
export interface MensajeCreate {
  id_destinatario: number;
  contenido: string;
}

/**
 * Respuesta de conteo de mensajes no leídos
 */
export interface MensajesNoLeidos {
  no_leidos: number;
}

/**
 * Estadísticas del sistema de mensajería (para debugging)
 */
export interface EstadisticasMensajes {
  estadisticas_generales: {
    total_mensajes: number;
    mensajes_leidos: number;
    mensajes_no_leidos: number;
    porcentaje_leidos: number;
  };
  top_remitentes: Array<{
    id: number;
    nombre: string;
    mensajes_enviados: number;
  }>;
  top_destinatarios: Array<{
    id: number;
    nombre: string;
    mensajes_recibidos: number;
  }>;
}