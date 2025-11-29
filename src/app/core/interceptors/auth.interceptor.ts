import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  /**
   * Dominios/puertos donde SÍ se adjunta el token
   * Incluye desarrollo local y production Railway
   */
  private readonly API_WHITELIST = [
    // Local development
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    // Production Railway
    'https://web-production-03d9e.up.railway.app',
    'https://me-destrozo-profe-production-4bf0.up.railway.app',
    // Current origin
    typeof window !== 'undefined' ? window.location.origin : ''
  ];

  /**
   * ¿Es URL relativa o coincide con alguno de los orígenes permitidos?
   */
  private isApiUrl(url: string): boolean {
    if (!/^https?:\/\//i.test(url)) return true; // relativa => nuestra app
    try {
      const u = new URL(url);
      return this.API_WHITELIST.some(base => {
        if (!base) return false;
        const b = new URL(base);
        return u.origin === b.origin; // mismo esquema+host+puerto
      });
    } catch {
      return false;
    }
  }

  /**
   * Endpoints de auth donde NO se adjunta token
   * (porque la petición misma autentica al usuario)
   */
  private isAuthEndpoint(req: HttpRequest<any>): boolean {
    const url = req.url.replace(/\/+$/, '');
    const method = req.method.toUpperCase();

    // Rutas de autenticación que NO necesitan token
    const isLogin = /\/auth\/login$/.test(url) && method === 'POST';
    const isGoogleSignin = /\/auth\/google_signin$/.test(url) && method === 'POST';
    const isRegister = (/\/usuarios\/register$|\/usuarios$/.test(url) && method === 'POST');
    const isEmailCheck = /\/email\/check$/.test(url) && method === 'POST';
    const isEmailSend = /\/email\/send-verification$/.test(url) && method === 'POST';

    return isLogin || isGoogleSignin || isRegister || isEmailCheck || isEmailSend;
  }

  /**
   * Obtiene id_entrenador desde storage para reescrituras de URLs
   */
  private resolveEntrenadorId(): number {
    const raw = localStorage.getItem('id_entrenador') || '';
    const id = parseInt(raw, 10);
    if (id > 0) return id;

    try {
      const gymUser = localStorage.getItem('gym_user');
      const user = gymUser ? JSON.parse(gymUser) : null;
      if (user?.id_usuario && (user.rol === 'entrenador' || user.rol === 'trainer')) {
        return Number(user.id_usuario) || 0;
      }
    } catch { /* no-op */ }

    return 0;
  }

  /**
   * Reescribe URLs legacy -> forma correcta con /{id_entrenador}
   */
  private rewriteClienteEntrenadorUrls(req: HttpRequest<any>): HttpRequest<any> {
    const [baseWithoutQuery, ...qsParts] = req.url.split('?');
    const cleanBase = baseWithoutQuery.replace(/\/+$/, '');
    const qs = qsParts.length ? '?' + qsParts.join('?') : '';

    // Coincide con .../cliente-entrenador/mis-clientes (con o sin /api)
    const misClientesRegex = /\/(api\/)?cliente-entrenador\/mis-clientes$/i;

    if (misClientesRegex.test(cleanBase)) {
      const id = this.resolveEntrenadorId();
      if (id > 0) {
        const newUrl = `${cleanBase}/${id}${qs}`;
        console.log('[AuthInterceptor:rewrite] 🔧 Reescrito:', req.url, '→', newUrl);
        return req.clone({ url: newUrl });
      } else {
        console.warn('[AuthInterceptor:rewrite] ⚠️ No se pudo resolver id_entrenador. URL no reescrita:', req.url);
      }
    }

    return req; // sin cambios
  }

  /**
   * 🔑 OBTENER TOKEN - CON FALLBACK ROBUSTO
   * Intenta múltiples fuentes para obtener el token
   * ✅ MEJORADO: Validación más estricta (mínimo 10 caracteres)
   */
  private obtenerToken(): string {
    // 1️⃣ Intenta obtenerlo desde el AuthService
    const tokenDelServicio = this.auth.getToken?.();
    if (tokenDelServicio && typeof tokenDelServicio === 'string' && tokenDelServicio.trim().length > 10) {
      return tokenDelServicio.trim();
    }

    // 2️⃣ Fallback: localStorage con clave 'gym_token'
    let tokenDelStorage = localStorage.getItem('gym_token');
    if (tokenDelStorage && tokenDelStorage.trim().length > 10) {
      return tokenDelStorage.trim();
    }

    // 3️⃣ Fallback: localStorage con clave alternativa 'token'
    let tokenAlt = localStorage.getItem('token');
    if (tokenAlt && tokenAlt.trim().length > 10) {
      return tokenAlt.trim();
    }

    // 4️⃣ Fallback: buscar en gym_user.token (si está guardado como JSON)
    try {
      const gymUser = localStorage.getItem('gym_user');
      if (gymUser) {
        const user = JSON.parse(gymUser);
        if (user?.token && typeof user.token === 'string' && user.token.trim().length > 10) {
          return user.token.trim();
        }
      }
    } catch { /* no-op */ }

    // ❌ No se encontró token en ningún lado
    return '';
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // 🚫 0) NO tocar rutas de IA (pueden tener su propio manejo)
    if (req.url.includes('/api/ia/')) {
      console.log('[AuthInterceptor] Saltando IA endpoint:', req.url);
      return next.handle(req);
    }

    // 1) Permite forzar el salto del auth en una petición concreta
    const skipAuth = req.headers.has('X-Skip-Auth');
    let request = skipAuth ? req.clone({ headers: req.headers.delete('X-Skip-Auth') }) : req;

    // 1.5) 🔧 Reescritura de URLs legacy ANTES de adjuntar token
    request = this.rewriteClienteEntrenadorUrls(request);

    // 2) 🔑 Obtén el token con fallback robusto
    const token = this.obtenerToken();

    // 3) Adjunta Authorization sólo cuando aplica
    const canAttach =
      !!token &&
      !skipAuth &&
      request.method !== 'OPTIONS' &&
      this.isApiUrl(request.url) &&
      !this.isAuthEndpoint(request);

    if (canAttach) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('[AuthInterceptor] 🔐 Token agregado a:', request.method, request.url);
      console.log('[AuthInterceptor] 📋 Token (primeros 20 chars):', token.substring(0, 20) + '...');
    } else if (!this.isAuthEndpoint(request)) {
      console.warn('[AuthInterceptor] ⚠️ Token NO agregado a:', request.url, {
        tieneToken: !!token,
        skipAuth,
        esOpcion: request.method === 'OPTIONS',
        esApiUrl: this.isApiUrl(request.url),
        esAuthEndpoint: this.isAuthEndpoint(request)
      });
    }

    // 4) Manejo mejorado de errores HTTP
    return next.handle(request).pipe(
      catchError((err: any) => {
        if (err instanceof HttpErrorResponse) {
          console.error(`[AuthInterceptor] HTTP ${err.status}:`, err.message, 'en', request.url);

          // ⭐ 401 = Token inválido o expirado
          // SOLO hacer logout si NO es un auth endpoint
          if (err.status === 401 && !this.isAuthEndpoint(request)) {
            console.warn('[AuthInterceptor] ⚠️ Token inválido/expirado (401)');
            console.warn('[AuthInterceptor] 🚪 Ejecutando logout...');
            this.auth.logout();
          }

          // 403 = Acceso prohibido (sin logout)
          if (err.status === 403) {
            console.warn('[AuthInterceptor] 🚫 Acceso prohibido (403)');
          }

          // 0 = Error CORS o de conexión
          if (err.status === 0 && err.message) {
            console.error('[AuthInterceptor] ❌ Posible error CORS o de red:', err.message);
          }
        }

        return throwError(() => err);
      })
    );
  }
}