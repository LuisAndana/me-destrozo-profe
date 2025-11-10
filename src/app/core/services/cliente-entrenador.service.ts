import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';

const API = (window as any).env?.apiUrl || 'http://localhost:8000';
const BASE_URL = `${API}/cliente-entrenador`;

// ============================================================
// INTERFACES
// ============================================================

export interface ClienteEntrenadorCreate {
  id_cliente: number;     // ⬅️ requerido por el backend
  id_entrenador: number;
  notas?: string;
}

export interface ClienteEntrenadorOut {
  id_relacion: number;
  id_cliente: number;
  id_entrenador: number;
  fecha_contratacion: string;
  estado: string;
  activo: boolean;
  notas?: string;
}

export interface ClienteOut {
  id_usuario: number;
  nombre: string;
  email: string;
  foto_url?: string;
  ciudad?: string;
  edad?: number;
  peso_kg?: number;
}

export interface EntrenadorOut {
  id_usuario: number;
  nombre: string;
  especialidad?: string;
  rating?: number;
  foto_url?: string;
  email: string;
  ciudad?: string;
}

export interface ClienteConRelacionOut {
  cliente: ClienteOut;
  fecha_contratacion: string;
  estado: string;
  notas?: string;
}

export interface EntrenadorConRelacionOut {
  entrenador: EntrenadorOut;
  fecha_contratacion: string;
  estado: string;
  notas?: string;
}

// ============================================================
// SERVICIO
// ============================================================

@Injectable({ providedIn: 'root' })
export class ClienteEntrenadorService {

  constructor(private http: HttpClient) {
    console.log('[ClienteEntrenadorService] Inicializado ✅');
    console.log('[ClienteEntrenadorService] API URL:', API);
  }

  // ============================================================
  // AUTENTICACIÓN Y HEADERS
  // ============================================================

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');

    if (!token || token.length < 8) {
      // Backend está sin auth, pero mantenemos cabeceras limpias
      return new HttpHeaders({ 'Content-Type': 'application/json' });
    }

    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    });
  }

  private handleError(error: HttpErrorResponse) {
    console.error('[handleError] Error completo:', error);

    const mensaje =
      error.error?.detail ||
      error.error?.message ||
      error.message ||
      'Error desconocido';

    return throwError(() => ({
      status: error.status,
      message: mensaje,
      error: error.error
    }));
  }

  // ============================================================
  // HELPERS: IDs desde localStorage
  // ============================================================

  private getIdClienteFromStorage(): number {
    const raw = localStorage.getItem('id_cliente') || '';
    const id = parseInt(raw, 10);
    if (id > 0) return id;
    try {
      const user = JSON.parse(localStorage.getItem('usuario') || 'null');
      if (user?.id) return Number(user.id);
    } catch {}
    return 0;
  }

  private getIdEntrenadorFromStorage(): number {
    const raw = localStorage.getItem('id_entrenador') || '';
    const id = parseInt(raw, 10);
    if (id > 0) return id;
    try {
      const user = JSON.parse(localStorage.getItem('usuario') || 'null');
      if (user?.id && (user.rol === 'entrenador' || user.rol === 'trainer')) return Number(user.id);
    } catch {}
    return 0;
    }

  // ============================================================
  // MÉTODOS PRINCIPALES (alineados con tu backend)
  // ============================================================

  /** Cliente contrata un entrenador */
  contratarEntrenador(id_entrenador: number, notas?: string): Observable<ClienteEntrenadorOut> {
    console.log('[contratarEntrenador] Iniciando con ID entrenador:', id_entrenador);

    const id_cliente = this.getIdClienteFromStorage();
    if (!id_cliente) {
      return throwError(() => ({ message: 'id_cliente no disponible en localStorage' }));
    }
    if (!id_entrenador) {
      return throwError(() => ({ message: 'id_entrenador inválido' }));
    }

    const payload: ClienteEntrenadorCreate = { id_cliente, id_entrenador, notas };

    return this.http.post<ClienteEntrenadorOut>(
      `${BASE_URL}/contratar`,
      payload,
      { headers: this.authHeaders() }
    ).pipe(
      tap(resp => console.log('[contratarEntrenador] ✅ Éxito:', resp)),
      catchError(err => this.handleError(err))
    );
  }

  /** Entrenador obtiene sus clientes → GET /mis-clientes/{id_entrenador} */
  misClientes(id_entrenador?: number): Observable<ClienteConRelacionOut[]> {
    const id = id_entrenador || this.getIdEntrenadorFromStorage();
    if (!id) {
      return throwError(() => ({ message: 'id_entrenador requerido' }));
    }
    const url = `${BASE_URL}/mis-clientes/${id}`; // ⬅️ con ID
    return this.http.get<ClienteConRelacionOut[]>(url, { headers: this.authHeaders() })
      .pipe(
        tap(r => console.log('[misClientes] ✅ Total:', r.length)),
        catchError(e => this.handleError(e))
      );
  }

  /** Cliente obtiene su entrenador actual → GET /mi-entrenador/{id_cliente} */
  miEntrenador(id_cliente?: number): Observable<EntrenadorConRelacionOut | null> {
    const id = id_cliente || this.getIdClienteFromStorage();

    if (!id) {
      return throwError(() => ({ message: 'id_cliente requerido' }));
    }

    const url = `${BASE_URL}/mi-entrenador/${id}`;
    return this.http.get<EntrenadorConRelacionOut | null>(
      url,
      { headers: this.authHeaders() }
    ).pipe(
      tap(r => r
        ? console.log('[miEntrenador] ✅ Entrenador:', r.entrenador.nombre)
        : console.log('[miEntrenador] ℹ️ No tiene entrenador')
      ),
      catchError(e => this.handleError(e))
    );
  }

  /** Verifica si el cliente tiene contratado a este entrenador
   *  → GET /relacion?id_cliente=&id_entrenador=
   */
  tengoEsteEntrenador(id_entrenador: number, id_cliente?: number): Observable<boolean> {
    const cliente = id_cliente || this.getIdClienteFromStorage();

    if (!cliente) {
      console.warn('[tengoEsteEntrenador] ⚠️ id_cliente no disponible; se devuelve false');
      return of(false);
    }
    if (!id_entrenador) {
      return of(false);
    }

    const url = `${BASE_URL}/relacion?id_cliente=${cliente}&id_entrenador=${id_entrenador}`;
    return this.http.get<boolean>(url, { headers: this.authHeaders() }).pipe(
      map((response) => {
        // El backend devuelve boolean directo
        return !!response;
      }),
      tap(resultado => console.log('[tengoEsteEntrenador] ✅ Resultado final:', resultado)),
      catchError((error) => {
        console.error('[tengoEsteEntrenador] ❌ Error:', error);
        return of(false); // No detiene el flujo
      })
    );
  }

  /** Cancela la relación con un entrenador → DELETE /{id_relacion} */
  cancelarRelacion(id_relacion: number): Observable<void> {
    if (!id_relacion) {
      return throwError(() => ({ message: 'id_relacion inválido' }));
    }

    return this.http.delete<void>(
      `${BASE_URL}/${id_relacion}`,
      { headers: this.authHeaders() }
    ).pipe(
      tap(() => console.log('[cancelarRelacion] ✅ Relación cancelada')),
      catchError(e => this.handleError(e))
    );
  }

  // ⛔ Estos endpoints no existen en tu backend actual:
  // GET /cliente-entrenador/{id_relacion}
  // PATCH /cliente-entrenador/{id_relacion}
  // Si en el futuro los agregas, podemos reactivarlos.

}
