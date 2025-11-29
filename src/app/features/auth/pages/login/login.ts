// src/app/features/auth/pages/login/login.ts
import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
  user_id?: number;
  email?: string;
  nombres?: string;
  rol?: string;
}

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login implements AfterViewInit {
  loginForm!: FormGroup;
  
  // Control de errores
  emailError: string = '';
  passwordError: string = '';
  generalError: string = '';
  isLoading: boolean = false;

  @ViewChild('googleSignInBtn', { static: false }) googleSignInBtn!: ElementRef;

  private lastGoogleCredential: string | null = null;

  constructor(
    private http: HttpClient, 
    private router: Router,
    private fb: FormBuilder
  ) {
    this.initializeForm();
  }

  // Inicializar formulario reactivo
  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  // Getters para acceso fácil a los controles
  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  // Validar email en tiempo real
  validateEmail(): void {
    this.emailError = '';
    const control = this.emailControl;

    if (!control || !control.touched) return;

    if (control.hasError('required')) {
      this.emailError = 'El email es obligatorio';
    } else if (control.hasError('email')) {
      this.emailError = 'Ingresa un email válido (ejemplo@domain.com)';
    }
  }

  // Validar contraseña en tiempo real
  validatePassword(): void {
    this.passwordError = '';
    const control = this.passwordControl;

    if (!control || !control.touched) return;

    if (control.hasError('required')) {
      this.passwordError = 'La contraseña es obligatoria';
    } else if (control.hasError('minlength')) {
      this.passwordError = 'La contraseña debe tener al menos 10 caracteres';
    }
  }

  // Limpiar errores
  clearErrors(): void {
    this.emailError = '';
    this.passwordError = '';
    this.generalError = '';
  }

  // ---------- Utilidades ----------
  private normalizeRole(raw?: string): 'alumno' | 'entrenador' {
    const r = (raw ?? '').toLowerCase().trim();
    const map: Record<string, 'alumno' | 'entrenador'> = {
      alumno: 'alumno',
      cliente: 'alumno',
      user: 'alumno',
      empleado: 'alumno',
      entrenador: 'entrenador',
      coach: 'entrenador',
      trainer: 'entrenador',
    };
    return map[r] ?? 'alumno';
  }

  private goToHomeByRole(rol?: string) {
    const norm = this.normalizeRole(rol);
    const target = norm === 'entrenador'
      ? '/pagina-principal-entrenador'
      : '/cliente';
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
    if (!credential) {
      this.generalError = 'No se recibió credencial de Google';
      return;
    }
    this.lastGoogleCredential = credential;

    this.http.post<LoginResponse>(
      `${environment.apiBase}/auth/google_signin`,
      { credential }
    ).subscribe({
      next: (res) => {
        if (!res?.ok) {
          this.generalError = res?.mensaje || 'No se pudo iniciar sesión con Google.';
          return;
        }

        const rawRol = res.usuario?.rol ?? res.rol ?? 'alumno';
        const roleForStore = this.normalizeRole(rawRol);

        const usuario = res.usuario ?? {
          id: res.user_id!,
          nombre: res.nombres || '',
          apellido: '',
          email: res.email || '',
          rol: roleForStore,
        };

        if (res.token) localStorage.setItem('token', res.token);
        localStorage.setItem('usuario', JSON.stringify({ ...usuario, rol: roleForStore }));
        this.goToHomeByRole(roleForStore);
      },
      error: (err) => {
        console.error('[google_signin][login] error:', err);
        const detail = err?.error?.detail || '';
        
        if (err?.status === 0) {
          this.generalError = 'No se pudo conectar al servidor (CORS/puerto)';
        } else if (err?.status === 401) {
          this.generalError = detail || 'Token de Google inválido';
        } else if (err?.status === 409) {
          this.generalError = detail || 'El email ya está registrado';
        } else if (err?.status === 422) {
          const rol = prompt('Selecciona tu rol: escribe "alumno" o "entrenador"');
          if (!rol || !/^(alumno|entrenador)$/i.test(rol)) {
            this.generalError = 'Rol inválido. Usa "alumno" o "entrenador"';
            return;
          }
          return this.retryGoogleWithRole(rol.toLowerCase() as 'alumno' | 'entrenador');
        } else {
          this.generalError = detail || 'No se pudo iniciar sesión con Google';
        }
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
          this.generalError = res?.mensaje || 'No se pudo completar el registro con Google';
          return;
        }

        const rawRol = res.usuario?.rol ?? res.rol ?? rol;
        const roleForStore = this.normalizeRole(rawRol);

        const usuario = res.usuario ?? {
          id: res.user_id!,
          nombre: res.nombres || '',
          apellido: '',
          email: res.email || '',
          rol: roleForStore,
        };

        if (res.token) localStorage.setItem('token', res.token);
        localStorage.setItem('usuario', JSON.stringify({ ...usuario, rol: roleForStore }));
        this.goToHomeByRole(roleForStore);
      },
      error: (err) => {
        console.error('[google_signin][retry] error:', err);
        const detail = err?.error?.detail || '';
        if (err?.status === 409) {
          this.generalError = detail || 'El email ya está registrado';
        } else {
          this.generalError = detail || 'No se pudo completar el registro con Google';
        }
      }
    });
  }

  // ---------- Login normal ----------
  login() {
    this.clearErrors();

    // Marcar campos como touched para mostrar validaciones
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });

    // Validar campos individuales
    this.validateEmail();
    this.validatePassword();

    // Si hay errores, no continuar
    if (this.emailError || this.passwordError || this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    const email = this.loginForm.get('email')?.value.trim().toLowerCase();
    const password = this.loginForm.get('password')?.value.trim();

    const url = `${environment.apiBase}/auth/login`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    this.http
      .post<LoginResponse>(url, { email, password }, { headers, withCredentials: false })
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          if (res?.ok && res.token && res.usuario) {
            localStorage.setItem('token', res.token);

            const roleForStore = this.normalizeRole(res.usuario.rol);
            const usuario = { ...res.usuario, rol: roleForStore };

            localStorage.setItem('usuario', JSON.stringify(usuario));
            this.goToHomeByRole(roleForStore);
          } else {
            this.generalError = res?.mensaje || 'Error en login';
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.error('❌ Error en login:', err);
          const detail = err?.error?.detail || err?.message || '';

          if (err?.status === 0) {
            this.generalError = 'No se pudo conectar al servidor (puerto/CORS)';
          } else if (err?.status === 400 && /google/i.test(detail)) {
            this.generalError = 'Tu cuenta está vinculada a Google. Usa "Continuar con Google"';
          } else if (err?.status === 401) {
            this.passwordError = 'Contraseña incorrecta';
          } else if (err?.status === 404) {
            this.emailError = 'Usuario no encontrado';
          } else if (err?.status === 422) {
            this.generalError = 'Datos inválidos (email/password)';
          } else {
            this.generalError = detail || 'Error en login';
          }
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

    const roleForNav = this.normalizeRole(usuario.rol);
    this.goToHomeByRole(roleForNav);
  }

  goToRegister() {
    this.router.navigate(['/registro']);
  }
}