import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';

const API = (window as any).env?.apiUrl || 'https://web-production-03d9e.up.railway.app';
const BASE_URL = `${API}/cliente-entrenador`;
const PAGOS_URL = `${API}/pagos`;

// ============================================================
// INTERFACES
// ============================================================

export interface ClienteEntrenadorCreate {
  id_cliente: number;
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
  apellido?: string;
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

export interface PaymentIntentResponse {
  client_secret: string;
  id_pago: number;
}

// ============================================================
// SERVICIO
// ============================================================

@Injectable({ providedIn: 'root' })
export class ClienteEntrenadorService {

  constructor(private http: HttpClient) {
    console.log('[ClienteEntrenadorService] Inicializado ✅');
    console.log('[ClienteEntrenadorService] API URL:', API);
    console.log('[ClienteEntrenadorService] BASE_URL:', BASE_URL);
  }

  // ============================================================
  // AUTENTICACIÓN Y HEADERS
  // ============================================================
  
  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');

    if (!token || token.length < 8) {
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
  // MÉTODOS PRINCIPALES
  // ============================================================

  /** Cliente contrata un entrenador */
  contratarEntrenador(id_entrenador: number, notas?: string): Observable<ClienteEntrenadorOut> {
    console.log('[contratarEntrenador] Iniciando con ID entrenador:', id_entrenador);

    const id_cliente = this.getIdClienteFromStorage();
    if (!id_cliente) {
      return throwError(() => ({ 
        status: 400,
        message: 'id_cliente no disponible en localStorage' 
      }));
    }
    if (!id_entrenador) {
      return throwError(() => ({ 
        status: 400,
        message: 'id_entrenador inválido' 
      }));
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

  /** Entrenador obtiene sus clientes */
  misClientes(id_entrenador?: number): Observable<ClienteConRelacionOut[]> {
    const id = id_entrenador || this.getIdEntrenadorFromStorage();
    if (!id) {
      return throwError(() => ({ 
        status: 400,
        message: 'id_entrenador requerido' 
      }));
    }
    const url = `${BASE_URL}/mis-clientes/${id}`;
    return this.http.get<ClienteConRelacionOut[]>(url, { headers: this.authHeaders() })
      .pipe(
        tap(r => console.log('[misClientes] ✅ Total:', r.length)),
        catchError(e => this.handleError(e))
      );
  }

  /** Cliente obtiene su entrenador actual */
  miEntrenador(id_cliente?: number): Observable<EntrenadorConRelacionOut | null> {
    const id = id_cliente || this.getIdClienteFromStorage();

    if (!id) {
      return throwError(() => ({ 
        status: 400,
        message: 'id_cliente requerido' 
      }));
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

  /** Verifica si el cliente tiene contratado a este entrenador */
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
        return !!response;
      }),
      tap(resultado => console.log('[tengoEsteEntrenador] ✅ Resultado:', resultado)),
      catchError((error) => {
        console.error('[tengoEsteEntrenador] ❌ Error:', error);
        return of(false);
      })
    );
  }

  /** Cancela la relación con un entrenador */
  cancelarRelacion(id_relacion: number): Observable<void> {
    if (!id_relacion) {
      return throwError(() => ({ 
        status: 400,
        message: 'id_relacion inválido' 
      }));
    }

    return this.http.delete<void>(
      `${BASE_URL}/${id_relacion}`,
      { headers: this.authHeaders() }
    ).pipe(
      tap(() => console.log('[cancelarRelacion] ✅ Relación cancelada')),
      catchError(e => this.handleError(e))
    );
  }

  // ============================================================
  // MÉTODOS DE PAGO
  // ============================================================

  /**
   * ✅ CORREGIDO: Crea un PaymentIntent con Stripe
   * @param idCliente ID del cliente que realiza el pago
   * @param idEntrenador ID del entrenador a contratar
   * @param monto Monto en centavos (ej: 200000 = $2000 MXN)
   */
  crearPaymentIntent(
    idCliente: number,
    idEntrenador: number,
    monto: number
  ): Observable<PaymentIntentResponse> {
    console.log('[crearPaymentIntent] Iniciando con:', { idCliente, idEntrenador, monto });

    const url = `${PAGOS_URL}/stripe/payment-intent`;
    
    return this.http.post<PaymentIntentResponse>(
      url,
      {}, // Body vacío
      {
        headers: this.authHeaders(),
        params: {
          id_cliente: idCliente.toString(),
          id_entrenador: idEntrenador.toString(),
          monto: monto.toString()
        }
      }
    ).pipe(
      tap(resp => {
        console.log('[crearPaymentIntent] ✅ PaymentIntent creado:', {
          id_pago: resp.id_pago,
          hasClientSecret: !!resp.client_secret
        });
      }),
      catchError(err => {
        console.error('[crearPaymentIntent] ❌ Error:', err);
        return this.handleError(err);
      })
    );
  }

  /**
   * ✅ CORREGIDO: Confirma un pago en el backend
   * Se utiliza después de que Stripe ha procesado el pago
   */
  confirmarPago(id_pago: number, referencia_externa?: string): Observable<any> {
    console.log('[confirmarPago] Confirmando pago:', id_pago);

    const url = `${PAGOS_URL}/${id_pago}/confirmar`;
    
    return this.http.post<any>(
      url,
      {},
      {
        headers: this.authHeaders(),
        params: referencia_externa ? { referencia_externa } : {}
      }
    ).pipe(
      tap(resp => console.log('[confirmarPago] ✅ Pago confirmado:', resp)),
      catchError(err => {
        console.error('[confirmarPago] ❌ Error:', err);
        return this.handleError(err);
      })
    );
  }

  /**
   * ✅ Obtiene el historial de pagos del cliente
   */
  obtenerHistorialPagos(idCliente: number, idEntrenador?: number): Observable<any> {
    console.log('[obtenerHistorialPagos] Obteniendo historial:', { idCliente, idEntrenador });

    const url = `${PAGOS_URL}/cliente/historial`;
    const params: any = { id_cliente: idCliente };
    
    if (idEntrenador) {
      params.id_entrenador = idEntrenador;
    }

    return this.http.get<any>(url, {
      headers: this.authHeaders(),
      params
    }).pipe(
      tap(resp => console.log('[obtenerHistorialPagos] ✅ Historial obtenido')),
      catchError(err => {
        console.error('[obtenerHistorialPagos] ❌ Error:', err);
        return this.handleError(err);
      })
    );
  }

  /**
   * ✅ Obtiene los ingresos del entrenador
   */
  obtenerIngresosEntrenador(idEntrenador: number, estado?: string): Observable<any[]> {
    console.log('[obtenerIngresosEntrenador] Obteniendo ingresos:', { idEntrenador, estado });

    const url = `${PAGOS_URL}/entrenador/ingresos`;
    const params: any = { id_entrenador: idEntrenador };
    
    if (estado) {
      params.estado = estado;
    }

    return this.http.get<any[]>(url, {
      headers: this.authHeaders(),
      params
    }).pipe(
      tap(resp => console.log('[obtenerIngresosEntrenador] ✅ Ingresos obtenidos:', resp.length)),
      catchError(err => {
        console.error('[obtenerIngresosEntrenador] ❌ Error:', err);
        return this.handleError(err);
      })
    );
  }
}