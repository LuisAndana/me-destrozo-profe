import { Component, AfterViewInit, ElementRef, ViewChild, ViewEncapsulation, OnInit, OnDestroy, Inject, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { DOCUMENT } from '@angular/common';

declare const google: any;

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css'],
  encapsulation: ViewEncapsulation.None
})
export class RegisterComponent implements AfterViewInit, OnInit, OnDestroy {
  nombre = '';
  apellido = '';
  email = '';
  password = '';
  confirmPassword = '';
  rol: 'alumno' | 'entrenador' | '' = '';

  readonly MIN_PASSWORD_LEN = 10;
  private readonly SPECIALS_RE = /[!@#$%^&*()\-\_=+\[\]{};:,.<>/?\\|`~"']/;

  @ViewChild('googleSignInBtn', { static: false }) googleSignInBtn!: ElementRef;

  submitted = false;
  passwordTouched = false;
  confirmTouched = false;
  roleTouched = false;

  formErrors: Record<'nombre' | 'apellido' | 'email' | 'password' | 'confirmPassword' | 'rol' | 'general', string> = {
    nombre: '', apellido: '', email: '', password: '', confirmPassword: '', rol: '', general: ''
  };

  constructor(
    private router: Router,
    private http: HttpClient,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private doc: Document
  ) {}

  // Asegura que los overrides globales apliquen (clase en <body>)
  ngOnInit(): void {
    this.renderer.addClass(this.doc.body, 'register-page');
    // Marca de depuración: si ves esto en consola, este componente es el que se monta.
    console.log('[Register] componente activo');
  }
  ngOnDestroy(): void {
    this.renderer.removeClass(this.doc.body, 'register-page');
  }

  // === GOOGLE SIGN-IN ===
  ngAfterViewInit(): void {
    const init = () => {
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

  private onGoogleCredential(response: any): void {
    this.clearErrors();
    const credential = response?.credential;
    if (!credential) {
      this.formErrors.general = 'No se recibió credencial de Google.';
      return;
    }

    const rolFront = this.rol;
    if (!rolFront || (rolFront !== 'alumno' && rolFront !== 'entrenador')) {
      this.formErrors.rol = 'Selecciona "alumno" o "entrenador" antes de continuar con Google.';
      this.roleTouched = true;
      this.scrollToFirstError();
      return;
    }

    this.http.post(
      `${environment.apiBase}${environment.endpoints.googleSignin}`,
      { credential, rol: rolFront }
    ).subscribe({
      next: () => this.router.navigate(['/login']),
      error: (err: any) => this.handleBackendErrors(err)
    });
  }

  // === Validaciones ===
  private emailUser(): string {
    return (this.email || '').split('@')[0]?.toLowerCase() || '';
  }
  private lower(v: string): string { return (v || '').toLowerCase(); }

  hasUpper(): boolean { return /[A-Z]/.test(this.password); }
  hasLower(): boolean { return /[a-z]/.test(this.password); }
  hasDigit(): boolean { return /\d/.test(this.password); }
  hasSpecial(): boolean { return this.SPECIALS_RE.test(this.password); }
  hasMinLen(): boolean { return (this.password || '').length >= this.MIN_PASSWORD_LEN; }
  hasNoSpaces(): boolean { return !/\s/.test(this.password || ''); }
  noPersonalData(): boolean {
    const pw = this.lower(this.password);
    const parts = [
      this.lower(this.nombre),
      this.lower(this.apellido),
      this.emailUser()
    ].filter(Boolean).map(p => p.trim()).filter(p => p.length >= 3);
    return !parts.some(p => pw.includes(p));
  }

  passwordPassedCount(): number {
    return [
      this.hasUpper(), this.hasLower(), this.hasDigit(),
      this.hasSpecial(), this.hasMinLen(), this.hasNoSpaces(), this.noPersonalData()
    ].filter(Boolean).length;
  }
  passwordScorePercent(): number { return Math.round((this.passwordPassedCount() / 7) * 100); }
  strengthLabel(): string {
    const p = this.passwordScorePercent();
    if (p >= 85) return 'Muy fuerte';
    if (p >= 60) return 'Fuerte';
    if (p >= 35) return 'Media';
    return 'Débil';
  }
  strengthClass(): string {
    const p = this.passwordScorePercent();
    if (p >= 85) return 'great';
    if (p >= 60) return 'good';
    if (p >= 35) return 'fair';
    return 'weak';
  }
  isPasswordValid(): boolean {
    return this.hasUpper() && this.hasLower() && this.hasDigit()
      && this.hasSpecial() && this.hasMinLen() && this.hasNoSpaces()
      && this.noPersonalData();
  }
  firstPasswordError(): string | null {
    if (!this.hasMinLen())  return `La contraseña debe tener al menos ${this.MIN_PASSWORD_LEN} caracteres.`;
    if (!this.hasUpper())   return 'Debe incluir al menos una letra MAYÚSCULA.';
    if (!this.hasLower())   return 'Debe incluir al menos una letra minúscula.';
    if (!this.hasDigit())   return 'Debe incluir al menos un número.';
    if (!this.hasSpecial()) return 'Debe incluir al menos un símbolo.';
    if (!this.hasNoSpaces()) return 'No puede contener espacios.';
    if (!this.noPersonalData()) return 'No debe contener tu nombre, apellido o usuario del email.';
    return null;
  }

  // === Errores / UX ===
  private clearErrors(): void {
    this.formErrors = { nombre: '', apellido: '', email: '', password: '', confirmPassword: '', rol: '', general: '' };
  }

  private translatePydanticMsg(msg: string): string {
    if (!msg) return 'Dato inválido.';
    const m1 = msg.match(/at least\s+(\d+)\s+characters/i);
    if (m1) return `Debe tener al menos ${m1[1]} caracteres.`;
    const m2 = msg.match(/at most\s+(\d+)\s+characters/i);
    if (m2) return `No debe exceder ${m2[1]} caracteres.`;
    if (/field required/i.test(msg)) return 'Campo requerido.';
    if (/valid email/i.test(msg)) return 'Email inválido.';
    return msg;
  }

  private mapDetailToFieldName(loc: any): 'nombre'|'apellido'|'email'|'password'|'rol'|'confirmPassword'|'general' {
    const arr = Array.isArray(loc) ? loc : [];
    const last = (arr[arr.length - 1] || '').toString().toLowerCase();
    if (['nombre','nombres'].includes(last)) return 'nombre';
    if (['apellido','apellidos'].includes(last)) return 'apellido';
    if (last === 'email') return 'email';
    if (last === 'password') return 'password';
    if (['rol','usertype'].includes(last)) return 'rol';
    return 'general';
  }

  private handleBackendErrors(err: any): void {
    this.clearErrors();

    if (err?.status === 0) {
      this.formErrors.general = 'No se pudo conectar al servidor.';
      this.scrollToFirstError(true);
      return;
    }
    if (err?.status === 409) {
      this.formErrors.email = err?.error?.detail || 'El email ya está registrado.';
      this.scrollToFirstError();
      return;
    }

    if (err?.status === 422) {
      const detail = err?.error?.detail;
      if (Array.isArray(detail)) {
        for (const d of detail) {
          const field = this.mapDetailToFieldName(d?.loc);
          const message = this.translatePydanticMsg(d?.msg || d?.detail || '');
          if (!this.formErrors[field]) this.formErrors[field] = message;
        }
      } else {
        const msg: string = (detail || err?.error?.mensaje || 'Datos inválidos.');
        const lower = msg.toLowerCase();
        if (lower.includes('rol')) this.formErrors.rol = msg;
        else if (lower.includes('email') || lower.includes('correo')) this.formErrors.email = msg;
        else if (lower.includes('contraseña') || lower.includes('password')) this.formErrors.password = msg;
        else this.formErrors.general = msg;
      }
      this.passwordTouched = true;
      this.confirmTouched = true;
      this.roleTouched = true;
      this.scrollToFirstError();
      return;
    }

    const msg = err?.error?.detail || err?.error?.mensaje || err?.message || 'Ocurrió un error.';
    this.formErrors.general = msg;
    this.scrollToFirstError(true);
  }

  private scrollToFirstError(scrollToTopIfGeneral = false): void {
    const el = document.querySelector('.field.invalid .control') as HTMLElement | null;
    if (el) {
      el.focus({ preventScroll: false });
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (scrollToTopIfGeneral) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // === Submit ===
  register(): void {
    this.submitted = true;
    this.clearErrors();

    const nombre   = this.nombre?.trim();
    const apellido = this.apellido?.trim();
    const email    = this.email?.trim().toLowerCase();
    const password = this.password;
    const rolFront = this.rol;

    if (!nombre) this.formErrors.nombre = 'Ingresa tu nombre.';
    if (!apellido) this.formErrors.apellido = 'Ingresa tus apellidos.';
    if (!email) this.formErrors.email = 'Ingresa tu email.';
    if (!rolFront) this.formErrors.rol = 'Selecciona un tipo de usuario.';
    if (password !== this.confirmPassword) this.formErrors.confirmPassword = 'Las contraseñas no coinciden.';
    if (!this.isPasswordValid()) this.formErrors.password = this.firstPasswordError() || 'Contraseña inválida.';

    const hasClientErrors = Object.values(this.formErrors).some(v => !!v);
    if (hasClientErrors) {
      this.passwordTouched = true;
      this.confirmTouched = true;
      this.roleTouched = true;
      this.scrollToFirstError();
      return;
    }

    const url = `${environment.apiBase}${environment.endpoints.register}`;

    const bodyA = { nombre, apellido, email, password, rol: rolFront };
    const bodyB = { nombres: nombre, apellidos: apellido, email, password, rol: rolFront };

    this.http.post(url, bodyA).subscribe({
      next: () => this.router.navigate(['/login']),
      error: (errA: any) => {
        const msg = (errA?.error?.detail || '').toString().toLowerCase();
        const shouldRetry = [400, 422, 500].includes(errA?.status) &&
          (msg.includes('faltan') || msg.includes('obligatori') || msg.includes('rol') || msg.includes('nombre'));
        if (shouldRetry) {
          this.http.post(url, bodyB).subscribe({
            next: () => this.router.navigate(['/login']),
            error: (errB: any) => this.handleBackendErrors(errB)
          });
        } else {
          this.handleBackendErrors(errA);
        }
      }
    });
  }
}
