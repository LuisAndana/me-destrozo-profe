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

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // 1) Permite forzar el salto del auth en una petición concreta
    const skipAuth = req.headers.has('X-Skip-Auth');
    let request = skipAuth ? req.clone({ headers: req.headers.delete('X-Skip-Auth') }) : req;

    // 2) Obtén el token (fallback a localStorage por si carga inicial)
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
          // Opcional: this.auth.logout(); // o limpiar token/redirect a login
        }
        return throwError(() => err);
      })
    );
  }
}
