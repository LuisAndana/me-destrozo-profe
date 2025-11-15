import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  /** Dominios/puertos donde SÍ se adjunta el token (ajusta los tuyos) */
  private readonly API_WHITELIST = [
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    typeof window !== 'undefined' ? window.location.origin : ''
  ];

  /** ¿Es URL relativa o coincide con alguno de los orígenes permitidos? */
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

  /** Endpoints de auth donde NO se adjunta token */
  private isAuthEndpoint(req: HttpRequest<any>): boolean {
    const url = req.url.replace(/\/+$/, '');
    const method = req.method.toUpperCase();

    // Ajusta estas rutas a las que realmente tengas
    const isLogin    = /\/usuarios\/login$/.test(url)    && method === 'POST';
    const isRegister = ((/\/usuarios\/register$/.test(url) || /\/usuarios$/.test(url)) && method === 'POST');
    const isRefresh  = /\/usuarios\/refresh$/.test(url)  && method === 'POST';

    return isLogin || isRegister || isRefresh;
  }

  /** Obtiene id_entrenador desde storage/usuario para reescrituras */
  private resolveEntrenadorId(): number {
    const raw = localStorage.getItem('id_entrenador') || '';
    const id = parseInt(raw, 10);
    if (id > 0) return id;

    try {
      const user = JSON.parse(localStorage.getItem('usuario') || 'null');
      if (user?.id && (user.rol === 'entrenador' || user.rol === 'trainer')) {
        return Number(user.id) || 0;
      }
    } catch { /* no-op */ }

    return 0;
  }

  /** Reescribe URLs legacy -> forma correcta con /{id_entrenador} */
  private rewriteClienteEntrenadorUrls(req: HttpRequest<any>): HttpRequest<any> {
    // quitamos query y trailing slash para evaluar patrón
    const [baseWithoutQuery, ...qsParts] = req.url.split('?');
    const cleanBase = baseWithoutQuery.replace(/\/+$/, '');
    const qs = qsParts.length ? '?' + qsParts.join('?') : '';

    // Coincide con .../cliente-entrenador/mis-clientes (con o sin /api)
    const misClientesRegex = /\/(api\/)?cliente-entrenador\/mis-clientes$/i;

    if (misClientesRegex.test(cleanBase)) {
      const id = this.resolveEntrenadorId();
      if (id > 0) {
        const newUrl = `${cleanBase}/${id}${qs}`;
        console.warn('[AuthInterceptor:rewrite] 🔧 Reescrito:', req.url, '→', newUrl);
        return req.clone({ url: newUrl });
      } else {
        console.error('[AuthInterceptor:rewrite] ❌ No se pudo resolver id_entrenador. URL no reescrita:', req.url);
      }
    }

    return req; // sin cambios
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  // 🚫 0) NO tocar rutas de IA
  if (req.url.includes('/api/ia/')) {
    return next.handle(req);
  }

  // 1) Permite forzar el salto del auth en una petición concreta
  const skipAuth = req.headers.has('X-Skip-Auth');
  let request = skipAuth ? req.clone({ headers: req.headers.delete('X-Skip-Auth') }) : req;

  // 1.5) 🔧 Reescritura de URLs legacy ANTES de adjuntar token
  request = this.rewriteClienteEntrenadorUrls(request);

  // 2) Obtén el token 
  const token =
    this.auth.getToken?.() ||
    localStorage.getItem('access_token') ||
    sessionStorage.getItem('access_token');

  // 3) Adjunta Authorization sólo cuando aplica
  const canAttach =
    !!token &&
    !skipAuth &&
    request.method !== 'OPTIONS' &&
    this.isApiUrl(request.url) &&
    !this.isAuthEndpoint(request);

  if (canAttach) {
    request = request.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  // 4) Manejo básico de 401
  return next.handle(request).pipe(
    catchError((err: any) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        console.warn('[AuthInterceptor] 401 en', request.method, request.url);
      }
      return throwError(() => err);
    })
  );
}
}