// src/app/core/services/mensajes.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, interval } from 'rxjs';
import { catchError, tap, switchMap, startWith } from 'rxjs/operators';
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

  private mensajesNoLeidosSubject = new BehaviorSubject<number>(0);
  public mensajesNoLeidos$ = this.mensajesNoLeidosSubject.asObservable();

  private pollingInterval = 30000; // 30 segundos

  constructor() {
    this.iniciarPollingMensajes();
  }

  // ============================
  // 🔑 Obtener ID del usuario
  // ============================
  private getUserId(): number {
    const usuarioStr = localStorage.getItem('usuario');
    if (!usuarioStr) return 0;

    const usuario = JSON.parse(usuarioStr);
    return usuario.id || usuario.id_usuario || 0;
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

  // ============================
  // 🔁 Polling mensajes no leídos
  // ============================
  private iniciarPollingMensajes(): void {
    const userId = this.getUserId();
    if (!userId) return;

    interval(this.pollingInterval)
      .pipe(
        startWith(0),
        switchMap(() => this.contarMensajesNoLeidos(userId))
      )
      .subscribe({
        next: (response) => {
          this.mensajesNoLeidosSubject.next(response.no_leidos);
        },
        error: (error) => {
          console.error('❌ Error en polling mensajes:', error);
        }
      });
  }

  // ============================
  // 📤 ENVIAR MENSAJE
  // ============================
  enviarMensaje(mensaje: MensajeCreate): Observable<Mensaje> {
    const userId = this.getUserId();
    if (!userId) return throwError(() => new Error('Usuario no autenticado'));

    const params = new HttpParams().set('user_id', userId);

    return this.http.post<Mensaje>(BASE_URL, mensaje, { params }).pipe(
      tap(() => console.log('📨 Mensaje enviado')),
      catchError(this.handleError)
    );
  }

  // ============================
  // 📥 OBTENER UN MENSAJE
  // ============================
  obtenerMensaje(idMensaje: number): Observable<Mensaje> {
    const userId = this.getUserId();
    const params = new HttpParams().set('user_id', userId);

    return this.http.get<Mensaje>(`${BASE_URL}/${idMensaje}`, { params })
      .pipe(catchError(this.handleError));
  }

  // ============================
  // 💬 OBTENER CONVERSACIÓN
  // ============================
  obtenerConversacion(idOtroUsuario: number, limit = 50, offset = 0):
    Observable<HistorialMensajes> {

    const userId = this.getUserId();

    const params = new HttpParams()
      .set('user_id', userId)
      .set('limit', limit)
      .set('offset', offset);

    return this.http.get<HistorialMensajes>(
      `${BASE_URL}/conversacion/${idOtroUsuario}`, { params }
    ).pipe(
      tap(res => console.log("📨 Conversación cargada:", res.total)),
      catchError(this.handleError)
    );
  }

  // ============================
  // 📋 LISTAR CONVERSACIONES
  // ============================
  obtenerConversaciones(): Observable<Conversacion[]> {
    const rol = this.obtenerRol()?.toLowerCase();

    if (rol?.includes('entrenador')) {
      return this.obtenerConversacionesEntrenador();
    }

    return this.obtenerConversacionesCliente();
  }

  obtenerConversacionesCliente(): Observable<Conversacion[]> {
    const userId = this.getUserId();
    const params = new HttpParams().set('user_id', userId);

    return this.http.get<Conversacion[]>(
      `${BASE_URL}/mis-conversaciones/lista`,
      { params }
    );
  }

  obtenerConversacionesEntrenador(): Observable<Conversacion[]> {
    const userId = this.getUserId();
    const params = new HttpParams().set('user_id', userId);

    return this.http.get<Conversacion[]>(
      `${BASE_URL}/mis-conversaciones-entrenador/lista`,
      { params }
    );
  }

  // ============================
  // 🟩 MARCAR LEÍDO
  // ============================
  marcarComoLeido(idMensaje: number): Observable<void> {
    const userId = this.getUserId();
    const params = new HttpParams().set('user_id', userId);

    return this.http.post<void>(
      `${BASE_URL}/${idMensaje}/marcar-leido`, {}, { params }
    ).pipe(catchError(this.handleError));
  }

  // ============================
  // 🟩 MARCAR CONVERSACIÓN LEÍDA
  // ============================
  marcarConversacionLeida(idOtroUsuario: number): Observable<void> {
    const userId = this.getUserId();
    const params = new HttpParams().set('user_id', userId);

    return this.http.post<void>(
      `${BASE_URL}/marcar-conversacion-leida/${idOtroUsuario}`,
      {},
      { params }
    ).pipe(
      tap(() => this.actualizarContadorMensajes()),
      catchError(this.handleError)
    );
  }

  // ============================
  // 🔢 CONTAR NO LEÍDOS
  // ============================
  contarMensajesNoLeidos(userId?: number): Observable<MensajesNoLeidos> {
    const id = userId || this.getUserId();
    const params = new HttpParams().set('user_id', id);

    return this.http.get<MensajesNoLeidos>(
      `${BASE_URL}/no-leidos/contar`,
      { params }
    ).pipe(catchError(this.handleError));
  }

  actualizarContadorMensajes(): void {
    const userId = this.getUserId();

    this.contarMensajesNoLeidos(userId).subscribe({
      next: (res) => this.mensajesNoLeidosSubject.next(res.no_leidos)
    });
  }

  // ============================
  // ❌ ELIMINAR
  // ============================
  eliminarMensaje(idMensaje: number): Observable<void> {
    const userId = this.getUserId();
    const params = new HttpParams().set('user_id', userId);

    return this.http.delete<void>(`${BASE_URL}/${idMensaje}`, { params })
      .pipe(catchError(this.handleError));
  }

  // ============================
  // ⚠️ ERRORES
  // ============================
  private handleError(error: HttpErrorResponse): Observable<never> {
    let msg = "Error desconocido";

    if (error.error?.detail) msg = error.error.detail;
    else msg = `Error ${error.status}: ${error.message}`;

    console.error("❌ MensajesService:", msg);
    return throwError(() => new Error(msg));
  }

 // =====================
// UTILIDADES PARA NOMBRES Y FECHAS
// =====================

/** Devuelve iniciales de un usuario */
obtenerIniciales(usuario: any): string {
  if (!usuario) return "?";
  const nombre = usuario.nombre || usuario.nombres || "";
  const apellido = usuario.apellido || usuario.apellido_pat || usuario.apellidos || "";
  const iniciales =
    (nombre?.charAt(0) || "") + (apellido?.charAt(0) || "");
  return iniciales.toUpperCase();
}

/** Devuelve el nombre completo del usuario */
obtenerNombreCompleto(usuario: any): string {
  if (!usuario) return "";
  const nombre = usuario.nombre || usuario.nombres || "";
  const apellidoPat = usuario.apellido_pat || usuario.apellidoPaterno || "";
  const apellidoMat = usuario.apellido_mat || usuario.apellidoMaterno || "";
  return `${nombre} ${apellidoPat} ${apellidoMat}`.trim();
}

/** Formatea una fecha tipo "hoy · 3:45 PM" */
formatearFechaMensaje(fecha: string): string {
  if (!fecha) return "";

  const f = new Date(fecha);
  const ahora = new Date();

  const esHoy =
    f.getDate() === ahora.getDate() &&
    f.getMonth() === ahora.getMonth() &&
    f.getFullYear() === ahora.getFullYear();

  const opcionesHora: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "numeric",
  };

  if (esHoy) {
    return `Hoy · ${f.toLocaleTimeString("es-MX", opcionesHora)}`;
  }

  return f.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });
}

/** Formatea fecha completa tipo "25 de enero de 2025, 4:30 PM" */
formatearFechaCompleta(fecha: string): string {
  if (!fecha) return "";

  const f = new Date(fecha);
  return f.toLocaleString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}
 
}
