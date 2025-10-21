// src/app/features/auth/pages/login/login.ts
import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';

declare const google: any;

interface LoginResponse {
  ok: boolean;
  mensaje?: string;
  token?: string;
  usuario?: {
    id: number;
    nombre?: string;
    apellido?: string;
    email: string;
    rol?: string;
  };
  // Posibles campos devueltos por /auth/google_signin
  user_id?: number;
  email?: string;
  nombres?: string;
  rol?: string;
}

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login implements AfterViewInit {
  email = '';
  password = '';

  @ViewChild('googleSignInBtn', { static: false }) googleSignInBtn!: ElementRef;

  // Guardamos la última credencial para reintentar con rol si el backend lo pide (422)
  private lastGoogleCredential: string | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  // ---------- Utilidades ----------
  private normalizeRole(raw?: string): 'alumno' | 'entrenador' {
    const r = (raw ?? '').toLowerCase().trim();
    const map: Record<string, 'alumno' | 'entrenador'> = {
      alumno: 'alumno',
      cliente: 'alumno',     // compat vieja
      user: 'alumno',        // compat
      empleado: 'alumno',    // compat
      entrenador: 'entrenador',
      coach: 'entrenador',
      trainer: 'entrenador',
    };
    return map[r] ?? 'alumno';
  }

  private goToHomeByRole(rol?: string) {
    const norm = this.normalizeRole(rol);
    const target = norm === 'entrenador' ? '/entrenador' : '/cliente';
    this.router.navigateByUrl(target, { replaceUrl: true });
  }

  // ---------- GOOGLE SIGN-IN ----------
  ngAfterViewInit(): void {
    const init = () => {
      if (!environment.googleClientId) {
        console.error('googleClientId vacío en environment');
        return;
      }
      google?.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (resp: any) => this.onGoogleCredential(resp),
        ux_mode: 'popup',
      });

      google?.accounts.id.renderButton(this.googleSignInBtn.nativeElement, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 320,
      });
    };

    if ((window as any).google) init();
    else (window as any).onGoogleLibraryLoad = init;
  }

  private onGoogleCredential(response: any) {
    const credential = response?.credential;
    if (!credential) { alert('No se recibió credencial de Google'); return; }
    this.lastGoogleCredential = credential;

    this.http.post<LoginResponse>(
      `${environment.apiBase}/auth/google_signin`,
      { credential } // primer intento sin rol
    ).subscribe({
      next: (res) => {
        if (!res?.ok) {
          alert(res?.mensaje || 'No se pudo iniciar sesión con Google.');
          return;
        }
        const usuario = res.usuario ?? {
          id: res.user_id!,
          nombre: res.nombres || '',
          apellido: '',
          email: res.email || '',
          rol: this.normalizeRole(res.rol || 'alumno'),
        };

        if (res.token) localStorage.setItem('token', res.token);
        localStorage.setItem('usuario', JSON.stringify({
          ...usuario,
          rol: this.normalizeRole(usuario.rol),
        }));
        this.goToHomeByRole(usuario.rol);
      },
      error: (err) => {
        console.error('[google_signin][login] error:', err);
        const detail = err?.error?.detail || '';
        if (err?.status === 0)   return alert('No se pudo conectar al servidor (CORS/puerto).');
        if (err?.status === 401) return alert(detail || 'Token de Google inválido.');
        if (err?.status === 409) return alert(detail || 'El email ya está registrado.');

        // Registro nuevo: el backend exige rol -> pedimos y reintentamos
        if (err?.status === 422) {
          const rol = prompt('Selecciona tu rol: escribe "alumno" o "entrenador"');
          if (!rol || !/^(alumno|entrenador)$/i.test(rol)) {
            return alert('Rol inválido. Intenta de nuevo con "alumno" o "entrenador".');
          }
          return this.retryGoogleWithRole(rol.toLowerCase() as 'alumno' | 'entrenador');
        }

        alert(detail || 'No se pudo iniciar sesión con Google.');
      }
    });
  }

  private retryGoogleWithRole(rol: 'alumno' | 'entrenador'): void {
    if (!this.lastGoogleCredential) return;
    this.http.post<LoginResponse>(
      `${environment.apiBase}/auth/google_signin`,
      { credential: this.lastGoogleCredential, rol }
    ).subscribe({
      next: (res) => {
        if (!res?.ok) {
          alert(res?.mensaje || 'No se pudo completar el registro con Google.');
          return;
        }
        const usuario = res.usuario ?? {
          id: res.user_id!,
          nombre: res.nombres || '',
          apellido: '',
          email: res.email || '',
          rol: this.normalizeRole(res.rol || 'alumno'),
        };

        if (res.token) localStorage.setItem('token', res.token);
        localStorage.setItem('usuario', JSON.stringify({
          ...usuario,
          rol: this.normalizeRole(usuario.rol),
        }));
        this.goToHomeByRole(usuario.rol);
      },
      error: (err) => {
        console.error('[google_signin][retry] error:', err);
        const detail = err?.error?.detail || '';
        if (err?.status === 409) return alert(detail || 'El email ya está registrado.');
        alert(detail || 'No se pudo completar el registro con Google.');
      }
    });
  }

  // ---------- Login normal ----------
  login() {
    const email = (this.email || '').trim().toLowerCase();
    const password = (this.password || '').trim();

    if (!email || !password) {
      alert('Ingresa email y contraseña');
      return;
    }

    // usar el endpoint con la lógica unificada del backend
    const url = `${environment.apiBase}/auth/login`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    this.http
      .post<LoginResponse>(url, { email, password }, { headers, withCredentials: false })
      .subscribe({
        next: (res) => {
          if (res?.ok && res.token && res.usuario) {
            localStorage.setItem('token', res.token);
            const usuario = { ...res.usuario, rol: this.normalizeRole(res.usuario.rol) };
            localStorage.setItem('usuario', JSON.stringify(usuario));
            this.goToHomeByRole(usuario.rol);
          } else {
            alert(res?.mensaje || 'Error en login');
          }
        },
        error: (err) => {
          console.error('❌ Error en login:', err);
          const detail = err?.error?.detail || err?.message || '';

          if (err?.status === 0)   return alert('No se pudo conectar al servidor (puerto/CORS).');
          // si la cuenta es Google-only, el backend responde 400
          if (err?.status === 400 && /google/i.test(detail)) {
            return alert('Tu cuenta está vinculada a Google. Usa el botón "Continuar con Google".');
          }
          if (err?.status === 401) return alert('Contraseña incorrecta.');
          if (err?.status === 404) return alert('Usuario no encontrado.');
          if (err?.status === 422) return alert('Payload inválido (email/password).');
          alert(detail || 'Error en login');
        },
      });
  }

  continuar(): void {
    const raw = localStorage.getItem('usuario');
    const usuario = raw ? (JSON.parse(raw) as { rol?: string }) : null;

    if (!usuario) {
      this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }

    this.goToHomeByRole(usuario.rol);
  }

  goToRegister() {
    this.router.navigate(['/registro']);
  }
}
