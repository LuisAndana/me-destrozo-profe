// src/app/features/auth/pages/register/register.ts
import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';

declare const google: any;

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css'],
})
export class RegisterComponent implements AfterViewInit {
  nombre = '';
  apellido = '';
  email = '';
  password = '';
  confirmPassword = '';
  rol: 'alumno' | 'entrenador' | '' = '';

  @ViewChild('googleSignInBtn', { static: false }) googleSignInBtn!: ElementRef;

  constructor(private router: Router, private http: HttpClient) {}

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
    const credential = response?.credential;
    if (!credential) { alert('No se recibió credencial de Google'); return; }

    // Debe elegir rol antes de continuar con Google
    const rolFront = this.rol;
    if (!rolFront || (rolFront !== 'alumno' && rolFront !== 'entrenador')) {
      alert('Selecciona "alumno" o "entrenador" antes de continuar con Google.');
      return;
    }

    this.http.post(
      `${environment.apiBase}${environment.endpoints.googleSignin}`,
      { credential, rol: rolFront }
    ).subscribe({
      next: () => this.router.navigate(['/login']),
      error: (err: any) => {
        console.error('[google_signin] status:', err?.status, 'body:', err?.error);
        const detail = err?.error?.detail;

        if (err?.status === 0)   return alert('No se pudo conectar al servidor (CORS/puerto).');
        if (err?.status === 401) return alert(detail || 'Token inválido de Google.');
        if (err?.status === 422) {
          // Backend puede responder 422 si falta o es inválido el rol
          return alert(detail || 'Debes seleccionar un rol válido: alumno o entrenador.');
        }
        if (err?.status === 409) return alert(detail || 'El email ya está registrado.');
        alert(detail || 'No se pudo iniciar sesión con Google.');
      }
    });
  }

  // === REGISTRO LOCAL ===
  register(): void {
    const nombre   = this.nombre?.trim();
    const apellido = this.apellido?.trim();
    const email    = this.email?.trim().toLowerCase();
    const password = this.password;
    const rolFront = this.rol; // 'alumno' | 'entrenador'

    if (!nombre || !apellido || !email || !password || !rolFront) {
      alert('Completa todos los campos'); return;
    }
    if (password !== this.confirmPassword) {
      alert('Las contraseñas no coinciden'); return;
    }
    if (rolFront !== 'alumno' && rolFront !== 'entrenador') {
      alert('Selecciona un rol válido'); return;
    }

    const url = `${environment.apiBase}${environment.endpoints.register}`;

    // Estrategia A: nombre/apellido
    const bodyA = {
      nombre,
      apellido,
      email,
      password,
      rol: rolFront, // ahora SIEMPRE enviamos 'alumno' | 'entrenador'
    };

    // Estrategia B: nombres/apellidos (por compatibilidad con otros backends)
    const bodyB = {
      nombres:   nombre,
      apellidos: apellido,
      email,
      password,
      rol: rolFront,
    };

    const shouldRetry = (err: any) => {
      const msg = (err?.error?.detail || err?.error?.mensaje || '').toString().toLowerCase();
      return [400, 422, 500].includes(err?.status) &&
             (msg.includes('faltan') || msg.includes('obligatori') || msg.includes('rol') || msg.includes('nombre'));
    };

    const showDetail = (err: any) => {
      const d = Array.isArray(err?.error?.detail)
        ? (err.error.detail[0]?.msg || err.error.detail[0]?.detail || '')
        : (err?.error?.detail || err?.error?.mensaje || err?.message);

      if (err?.status === 409) return alert(d || 'Email ya registrado');
      if (err?.status === 422) return alert(d || 'Datos inválidos: revisa nombre, apellido, email o rol');
      if (err?.status === 0)   return alert('No se pudo conectar al servidor (CORS/puerto).');
      alert(d || 'Error interno al registrar');
    };

    // Intento A
    this.http.post(url, bodyA).subscribe({
      next: () => {
        alert('¡Registro exitoso!');
        this.router.navigate(['/login']);
      },
      error: (errA: any) => {
        console.warn('[register:A] fallo ->', errA?.status, errA?.error);
        if (shouldRetry(errA)) {
          // Intento B
          this.http.post(url, bodyB).subscribe({
            next: () => {
              alert('¡Registro exitoso!');
              this.router.navigate(['/login']);
            },
            error: (errB: any) => {
              console.error('[register:B] fallo ->', errB?.status, errB?.error);
              showDetail(errB);
            }
          });
        } else {
          showDetail(errA);
        }
      }
    });
  }
}
