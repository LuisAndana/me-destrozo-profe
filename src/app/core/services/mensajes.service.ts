// src/app/core/services/mensajes.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, interval } from 'rxjs';
import { catchError, tap, map, switchMap, startWith } from 'rxjs/operators';
import {
  Mensaje,
  Conversacion,
  HistorialMensajes,
  MensajeCreate,
  MensajesNoLeidos
} from '../models/mensaje.models';

const API = (window as any).env?.apiUrl || 'http://localhost:8000';
const BASE_URL = `${API}/mensajes`;

@Injectable({
  providedIn: 'root'
})
export class MensajesService {
  private http = inject(HttpClient);

  // BehaviorSubject para actualizar mensajes no leídos en tiempo real
  private mensajesNoLeidosSubject = new BehaviorSubject<number>(0);
  public mensajesNoLeidos$ = this.mensajesNoLeidosSubject.asObservable();

  // Polling cada 30 segundos para actualizar mensajes
  private pollingInterval = 30000; // 30 segundos

  constructor() {
    this.iniciarPollingMensajes();
  }
  private obtenerRol(): string | null {
  try {
    const usuarioStr = localStorage.getItem('usuario');
    if (!usuarioStr) return null;

    const usuario = JSON.parse(usuarioStr);
    return usuario.rol || usuario.role || null;
  } catch {
    return null;
  }
}

  /**
   * 🔄 Inicia el polling automático de mensajes no leídos
   */
  private iniciarPollingMensajes(): void {
    const userId = this.obtenerIdUsuario();
    if (!userId) return;

    interval(this.pollingInterval)
      .pipe(
        startWith(0), // Ejecutar inmediatamente
        switchMap(() => this.contarMensajesNoLeidos(userId))
      )
      .subscribe({
        next: (response) => {
          this.mensajesNoLeidosSubject.next(response.no_leidos);
        },
        error: (error) => {
          console.error('❌ Error en polling de mensajes:', error);
        }
      });
  }

  /**
   * 🆔 Obtiene el ID del usuario actual desde localStorage
   */
  private obtenerIdUsuario(): number | null {
    try {
      const usuarioStr = localStorage.getItem('usuario');
      if (!usuarioStr) return null;
      
      const usuario = JSON.parse(usuarioStr);
      return usuario.id || usuario.id_usuario || null;
    } catch (error) {
      console.error('❌ Error al obtener ID de usuario:', error);
      return null;
    }
  }

  /**
   * 📤 Envía un nuevo mensaje
   */
  enviarMensaje(mensaje: MensajeCreate): Observable<Mensaje> {
    const userId = this.obtenerIdUsuario();
    if (!userId) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    const params = new HttpParams().set('user_id', userId.toString());

    return this.http.post<Mensaje>(BASE_URL, mensaje, { params }).pipe(
      tap(() => console.log('✅ Mensaje enviado correctamente')),
      catchError(this.handleError)
    );
  }

  /**
   * 📥 Obtiene un mensaje específico
   */
  obtenerMensaje(idMensaje: number): Observable<Mensaje> {
    const userId = this.obtenerIdUsuario();
    if (!userId) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    const params = new HttpParams().set('user_id', userId.toString());

    return this.http.get<Mensaje>(`${BASE_URL}/${idMensaje}`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 💬 Obtiene el historial de conversación con otro usuario
   */
  obtenerConversacion(
    idOtroUsuario: number,
    limit: number = 50,
    offset: number = 0
  ): Observable<HistorialMensajes> {
    const userId = this.obtenerIdUsuario();
    if (!userId) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    const params = new HttpParams()
      .set('user_id', userId.toString())
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    return this.http.get<HistorialMensajes>(
      `${BASE_URL}/conversacion/${idOtroUsuario}`,
      { params }
    ).pipe(
      tap((historial) => console.log(`✅ Conversación cargada: ${historial.total} mensajes`)),
      catchError(this.handleError)
    );
  }

  /**
   * 📋 Obtiene todas las conversaciones del usuario
   */
 obtenerConversaciones(): Observable<Conversacion[]> {
  const rol = this.obtenerRol()?.toLowerCase();

  if (rol?.includes('entrenador')) {
    console.log("📩 Cargando conversaciones del ENTRENADOR…");
    return this.obtenerConversacionesEntrenador();
  }

  console.log("📩 Cargando conversaciones del CLIENTE…");
  return this.obtenerConversacionesCliente();
}


  obtenerConversacionesCliente(): Observable<Conversacion[]> {
  const userId = this.obtenerIdUsuario();
  if (!userId) return throwError(() => new Error('Usuario no autenticado'));

  const params = new HttpParams().set('user_id', userId.toString());

  return this.http.get<Conversacion[]>(
    `${BASE_URL}/mis-conversaciones/lista`,
    { params }
  );
}
obtenerConversacionesEntrenador(): Observable<Conversacion[]> {
  const userId = this.obtenerIdUsuario();
  if (!userId) return throwError(() => new Error('Usuario no autenticado'));

  const params = new HttpParams().set('user_id', userId.toString());

  return this.http.get<Conversacion[]>(
    `${BASE_URL}/mis-conversaciones-entrenador/lista`,
    { params }
  );
}

  /**
   * ✅ Marca un mensaje como leído
   */
  marcarComoLeido(idMensaje: number): Observable<void> {
    const userId = this.obtenerIdUsuario();
    if (!userId) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    const params = new HttpParams().set('user_id', userId.toString());

    return this.http.post<void>(
      `${BASE_URL}/${idMensaje}/marcar-leido`,
      {},
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * ✅ Marca toda una conversación como leída
   */
  marcarConversacionLeida(idOtroUsuario: number): Observable<void> {
    const userId = this.obtenerIdUsuario();
    if (!userId) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    const params = new HttpParams().set('user_id', userId.toString());

    return this.http.post<void>(
      `${BASE_URL}/marcar-conversacion-leida/${idOtroUsuario}`,
      {},
      { params }
    ).pipe(
      tap(() => {
        // Actualizar contador de mensajes no leídos
        this.actualizarContadorMensajes();
      }),
      catchError(this.handleError)
    );
  }

  /**
   * 🔢 Cuenta los mensajes no leídos del usuario
   */
  contarMensajesNoLeidos(userId?: number): Observable<MensajesNoLeidos> {
    const id = userId || this.obtenerIdUsuario();
    if (!id) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    const params = new HttpParams().set('user_id', id.toString());

    return this.http.get<MensajesNoLeidos>(
      `${BASE_URL}/no-leidos/contar`,
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 🔄 Actualiza el contador de mensajes no leídos
   */
  actualizarContadorMensajes(): void {
    const userId = this.obtenerIdUsuario();
    if (!userId) return;

    this.contarMensajesNoLeidos(userId).subscribe({
      next: (response) => {
        this.mensajesNoLeidosSubject.next(response.no_leidos);
      },
      error: (error) => {
        console.error('❌ Error al actualizar contador:', error);
      }
    });
  }

  /**
   * 🗑️ Elimina un mensaje (solo el remitente)
   */
  eliminarMensaje(idMensaje: number): Observable<void> {
    const userId = this.obtenerIdUsuario();
    if (!userId) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    const params = new HttpParams().set('user_id', userId.toString());

    return this.http.delete<void>(`${BASE_URL}/${idMensaje}`, { params }).pipe(
      tap(() => console.log('✅ Mensaje eliminado')),
      catchError(this.handleError)
    );
  }

  /**
   * ❌ Manejo de errores HTTP
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ocurrió un error desconocido';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      errorMessage = error.error?.detail || `Error ${error.status}: ${error.message}`;
    }

    console.error('❌ Error en MensajesService:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * 🔍 Obtiene el nombre completo de un usuario
   */
  obtenerNombreCompleto(usuario: any): string {
    if (!usuario) return 'Usuario';
    
    const nombre = usuario.nombre || '';
    const apellido = usuario.apellido || '';
    
    return `${nombre} ${apellido}`.trim() || usuario.email || 'Usuario';
  }

  /**
   * 🎨 Obtiene las iniciales de un usuario para el avatar
   */
  obtenerIniciales(usuario: any): string {
    if (!usuario) return '?';
    
    const nombre = usuario.nombre || '';
    const apellido = usuario.apellido || '';
    
    if (nombre && apellido) {
      return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
    } else if (nombre) {
      return nombre.charAt(0).toUpperCase();
    } else if (usuario.email) {
      return usuario.email.charAt(0).toUpperCase();
    }
    
    return '?';
  }

  /**
   * 📅 Formatea la fecha de un mensaje para mostrarla
   */
  formatearFechaMensaje(fecha: string): string {
    const fechaMensaje = new Date(fecha);
    const ahora = new Date();
    const diferenciaDias = Math.floor((ahora.getTime() - fechaMensaje.getTime()) / (1000 * 60 * 60 * 24));

    if (diferenciaDias === 0) {
      // Hoy - mostrar hora
      return fechaMensaje.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diferenciaDias === 1) {
      // Ayer
      return 'Ayer';
    } else if (diferenciaDias < 7) {
      // Esta semana - mostrar día
      return fechaMensaje.toLocaleDateString('es-ES', { weekday: 'long' });
    } else {
      // Más de una semana - mostrar fecha
      return fechaMensaje.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  }

  /**
   * 📅 Formatea la fecha completa para el chat
   */
  formatearFechaCompleta(fecha: string): string {
    const fechaMensaje = new Date(fecha);
    return fechaMensaje.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}