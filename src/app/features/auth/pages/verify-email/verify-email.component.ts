import { Component, OnInit, OnDestroy, Inject, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { DOCUMENT } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-verify-email',
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './verify-email.html',
  styleUrls: ['./verify-email.css']
})
export class VerifyEmailComponent implements OnInit, OnDestroy {

  email = '';
  verificationCode = '';
  isVerifying = false;
  submitted = false;

  formErrors = {
    email: '',
    code: '',
    general: ''
  };

  successMessage = '';
  showSuccessAnimation = false;

  resendCountdown = 0;
  canResend = true;

  constructor(
    private router: Router,
    private http: HttpClient,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private doc: Document
  ) {}

  ngOnInit(): void {
    this.renderer.addClass(this.doc.body, 'verify-email-page');

    const storedEmail = sessionStorage.getItem('registerEmail');
    if (storedEmail) {
      this.email = storedEmail;
    }

    console.log('✅ VerifyEmailComponent inicializado');
    console.log('📧 Email pre-rellenado:', this.email);
    console.log('🔗 API Base:', environment.apiBase);
    console.log('📍 Endpoint:', environment.endpoints.verifyEmail);
  }

  ngOnDestroy(): void {
    this.renderer.removeClass(this.doc.body, 'verify-email-page');
  }

  verifyCode(): void {
    this.submitted = true;
    this.clearErrors();

    // 🔴 FIX: Si no hay email en sessionStorage, usar el del input o pedir al usuario
    let emailToVerify = this.email?.trim().toLowerCase();
    
    if (!emailToVerify) {
      emailToVerify = prompt('Por favor, ingresa tu email:') || '';
      if (!emailToVerify) {
        this.formErrors.email = 'Ingresa tu email.';
        this.scrollToFirstError();
        return;
      }
    }

    const code = this.verificationCode?.trim();

    console.log('🔍 [VERIFY CODE] Iniciando verificación...');
    console.log('📧 Email:', emailToVerify);
    console.log('🔐 Código:', code);

    if (!code) {
      this.formErrors.code = 'Ingresa el código de verificación.';
      this.scrollToFirstError();
      return;
    }

    if (code.length < 6) {
      this.formErrors.code = 'El código debe tener al menos 6 caracteres.';
      this.scrollToFirstError();
      return;
    }

    this.isVerifying = true;

    // 🔗 Construir URL
    const endpoint = `${environment.apiBase}${environment.endpoints.verifyEmail}`;
    console.log('🌐 POST a:', endpoint);

    const payload = {
      email: emailToVerify,
      token: code
    };
    console.log('📤 Payload:', payload);

    // 📡 Hacer request
    this.http.post<any>(endpoint, payload).subscribe({
      next: (response: any) => {
        this.isVerifying = false;
        console.log('✅ RESPUESTA RECIBIDA:');
        console.log('Completa:', response);
        console.log('Tipo:', typeof response);
        console.log('Keys:', Object.keys(response || {}));
        console.log('success:', response?.success);
        console.log('ok:', response?.ok);
        console.log('verified:', response?.verified);

        // Verifica múltiples posibles estructuras de respuesta exitosa
        const isSuccessful = response?.success === true || 
                            response?.ok === true || 
                            response?.verified === true;

        console.log('¿Es exitosa?', isSuccessful);

        if (isSuccessful) {
          console.log('🎉 ¡ÉXITO! Email verificado');
          this.successMessage = '✓ Email verificado exitosamente';
          this.showSuccessAnimation = true;
          sessionStorage.removeItem('registerEmail');

          // Esperar a que la animación se complete antes de redirigir
          console.log('⏱️ Esperando 1500ms antes de redirigir...');
          setTimeout(() => {
            console.log('🚀 NAVEGANDO A /login');
            this.router.navigate(['/login'], { replaceUrl: true }).then(
              (success) => {
                console.log('✅ Navegación exitosa:', success);
              },
              (error) => {
                console.error('❌ Error en navegación:', error);
              }
            );
          }, 1500);
        } else {
          console.log('❌ Respuesta no es exitosa. Message:', response?.message);
          this.formErrors.general = response?.message || response?.detail || 'Error verificando email';
          this.scrollToFirstError(true);
        }
      },
      error: (err: any) => {
        this.isVerifying = false;
        console.error('❌ ERROR COMPLETO:');
        console.error('Status:', err?.status);
        console.error('StatusText:', err?.statusText);
        console.error('Error object:', err?.error);
        console.error('Error message:', err?.message);
        console.error('Full error:', err);

        const errorMsg = err?.error?.detail || 
                        err?.error?.message || 
                        err?.error?.msg ||
                        err?.message ||
                        'Error al verificar el email. Intenta de nuevo.';
        
        console.log('📌 Mostrando error al usuario:', errorMsg);
        this.formErrors.general = errorMsg;
        this.scrollToFirstError(true);
      }
    });
  }

  resendCode(): void {
    this.submitted = true;
    this.clearErrors();

    let emailToResend = this.email?.trim().toLowerCase();

    if (!emailToResend) {
      emailToResend = prompt('Por favor, ingresa tu email:') || '';
      if (!emailToResend) {
        this.formErrors.email = 'Ingresa tu email para reenviar el código.';
        this.scrollToFirstError();
        return;
      }
    }

    if (!this.canResend) {
      this.formErrors.general = `Espera ${this.resendCountdown} segundos antes de reenviar.`;
      return;
    }

    this.isVerifying = true;

    console.log('🔄 [RESEND] Reenviando código a:', emailToResend);

    this.http.post(
      `${environment.apiBase}${environment.endpoints.resendVerification}`,
      {
        email: emailToResend,
        nombre: ''
      }
    ).subscribe({
      next: () => {
        this.isVerifying = false;
        console.log('✅ Código reenviado exitosamente');
        this.successMessage = '✓ Código reenviado a tu email';

        this.startResendCountdown();

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (err: any) => {
        this.isVerifying = false;
        console.error('❌ Error reenviando:', err);
        const errorMsg = err?.error?.detail || err?.error?.message || 'Error reenviando código';
        this.formErrors.general = errorMsg;
        this.scrollToFirstError(true);
      }
    });
  }

  private startResendCountdown(): void {
    this.canResend = false;
    this.resendCountdown = 60;

    const interval = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        clearInterval(interval);
        this.canResend = true;
      }
    }, 1000);
  }

  private clearErrors(): void {
    this.formErrors = { email: '', code: '', general: '' };
  }

  private scrollToFirstError(scrollToTop = false): void {
    const el = document.querySelector('.field.invalid .control') as HTMLElement | null;

    if (el) {
      el.focus({ preventScroll: false });
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goBackToRegister(): void {
    sessionStorage.setItem('registerEmail', this.email);
    this.router.navigate(['/registro']);
  }
}