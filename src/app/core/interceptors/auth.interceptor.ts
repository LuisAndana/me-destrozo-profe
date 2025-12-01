// src/app/core/interceptors/auth.interceptor.ts - VERSIÓN CORREGIDA

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
   * 🔍 Detecta si la petición es un file upload (FormData)
   */
  private isFileUpload(req: HttpRequest<any>): boolean {
    // Método 1: Detectar por tipo de body
    if (req.body instanceof FormData) {
      return true;
    }

    // Método 2: Detectar por URL (endpoints de upload)
    if (/\/upload\//.test(req.url)) {
      return true;
    }

    // Método 3: Verificar si ya tiene Content-Type multipart
    const contentType = req.headers.get('Content-Type');
    if (contentType?.includes('multipart/form-data')) {
      return true;
    }

    return false;
  }

  /**
   * Obtiene token del storage con fallback robusto
   */
  private obtenerToken(): string | null {
    // 1. Intentar obtener de localStorage
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('access_token') || 
                   localStorage.getItem('token') ||
                   localStorage.getItem('auth_token');
      if (token) return token;
    }

    // 2. Intentar obtener de sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      const token = sessionStorage.getItem('access_token') ||
                   sessionStorage.getItem('token');
      if (token) return token;
    }

    // 3. Intentar obtener del servicio de auth
    try {
      return this.auth.getToken();
    } catch {
      return null;
    }
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
      return user?.id_usuario || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Reescribe URLs legacy de cliente/entrenador
   * 
   * ⚠️ IMPORTANTE: NO reescribir rutas que usan JWT token:
   * - /usuarios/entrenador/perfil (GET/PUT con JWT)
   * - Estas rutas obtienen el ID del token, NO de la URL
   */
  private rewriteClienteEntrenadorUrls(req: HttpRequest<any>): HttpRequest<any> {
    let url = req.url;
    const idEntrenador = this.resolveEntrenadorId();

    if (!idEntrenador) return req;

    // ✅ NO REESCRIBIR rutas que usan JWT para identificación
    const jwtBasedRoutes = [
      /\/usuarios\/entrenador\/perfil$/,  // GET/PUT perfil con JWT
      /\/api\/upload\/profile-photo$/,     // Upload con JWT
    ];

    for (const pattern of jwtBasedRoutes) {
      if (pattern.test(url)) {
        console.log('[AuthInterceptor] ℹ️ Ruta usa JWT, no reescribir:', url);
        return req; // NO modificar
      }
    }

    // Reemplazar solo patrones legacy que SÍ necesitan ID en URL
    const patterns = [
      { from: /\/cliente\/(\d+)\/entrenador$/, to: `/cliente/$1/entrenador/${idEntrenador}` },
      // ❌ REMOVIDO: { from: /\/entrenador\/perfil$/, to: `/entrenador/${idEntrenador}/perfil` }
      // ❌ REMOVIDO: { from: /\/entrenador\/clientes$/, to: `/entrenador/${idEntrenador}/clientes` }
    ];

    for (const p of patterns) {
      if (p.from.test(url)) {
        url = url.replace(p.from, p.to);
        console.log('[AuthInterceptor] 🔄 URL reescrita:', req.url, '→', url);
        break;
      }
    }

    return url !== req.url ? req.clone({ url }) : req;
  }

  /**
   * 🎯 Interceptor principal
   */
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let request = req;

    // 1) Saltar si tiene header especial
    const skipAuth = request.headers.has('X-Skip-Auth');
    request = skipAuth ?
      req.clone({ headers: req.headers.delete('X-Skip-Auth') }) : req;

    // 1.5) Reescritura de URLs legacy ANTES de adjuntar token
    request = this.rewriteClienteEntrenadorUrls(request);

    // 2) Obtén el token con fallback robusto
    const token = this.obtenerToken();

    // 3) Determinar si podemos adjuntar el token
    const canAttach =
      !!token &&
      !skipAuth &&
      request.method !== 'OPTIONS' &&
      this.isApiUrl(request.url) &&
      !this.isAuthEndpoint(request);

    if (canAttach) {
      // 🔥 CRÍTICO: Detectar si es file upload
      const isUpload = this.isFileUpload(request);

      if (isUpload) {
        // ✅ Para uploads: SOLO agregar Authorization, NO Content-Type
        // El browser establece automáticamente Content-Type con el boundary correcto
        request = request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
        console.log('[AuthInterceptor] 📤 File upload detectado - Solo Authorization agregado');
        console.log('[AuthInterceptor] 🔐 Token agregado a:', request.method, request.url);
      } else {
        // ✅ Para requests JSON normales: agregar ambos headers
        request = request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('[AuthInterceptor] 🔐 Token y Content-Type agregados a:', request.method, request.url);
      }

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

          // 422 = Unprocessable Content (común en file uploads mal configurados)
          if (err.status === 422) {
            console.error('[AuthInterceptor] ⚠️ Error 422 - Posible problema con multipart/form-data');
            console.error('[AuthInterceptor] Headers enviados:', request.headers.keys());
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