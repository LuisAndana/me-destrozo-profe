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

  // Dominios/puertos donde SÍ se adjunta el token (ajusta si usas otro host/puerto)
  private readonly API_WHITELIST = [
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'http://localhost:8000',      
    'http://127.0.0.1:8000',      
    typeof window !== 'undefined' ? window.location.origin : ''
  ];

  private isApiUrl(url: string): boolean {
    // Si es URL relativa -> es nuestra app
    if (!/^https?:\/\//i.test(url)) return true;
    return this.API_WHITELIST.some(base =>
      !!base && (url === base || url.startsWith(base + '/') || url.startsWith(base + '?'))
    );
  }

  private isAuthEndpoint(req: HttpRequest<any>): boolean {
    const url = req.url.replace(/\/+$/, ''); // sin slash final
    const isLogin = /\/usuarios\/login$/.test(url) && req.method === 'POST';
    const isRegister = ((/\/usuarios\/register$/.test(url) || /\/usuarios$/.test(url)) && req.method === 'POST');
    return isLogin || isRegister;
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getToken?.();
    const skipAuth = req.headers.has('X-Skip-Auth');

    let request = req;

    // Limpiar el header de control si viene
    if (skipAuth) {
      request = request.clone({ headers: request.headers.delete('X-Skip-Auth') });
    }

    // No modificar preflight, ni endpoints de auth, ni requests fuera de nuestra API si hay whitelist
    const canAttach =
      !!token &&
      !skipAuth &&
      req.method !== 'OPTIONS' &&
      this.isApiUrl(req.url) &&
      !this.isAuthEndpoint(req);

    if (canAttach) {
      request = request.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(request).pipe(
      catchError((err: any) => {
        if (err instanceof HttpErrorResponse && err.status === 401) {
          console.warn('[AuthInterceptor] 401 en', req.method, req.url);
          // Opcional: this.auth.logout(); // o limpiar token
        }
        return throwError(() => err);
      })
    );
  }
}
