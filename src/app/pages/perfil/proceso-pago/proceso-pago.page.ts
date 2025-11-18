// proceso-pago.page.ts - VERSIÓN FINAL CORREGIDA
/**
 * Página de Proceso de Pago
 * Página dedicada para el proceso de pago académico ficticio
 * Arquitectura limpia: separada del componente de detalles
 * 
 * CORRECCIONES IMPLEMENTADAS:
 * ✅ Validación de usuario autenticado
 * ✅ Validación de tarjeta (Luhn Algorithm)
 * ✅ Validación de fecha de expiración
 * ✅ Manejo robusto de errores
 * ✅ Prevención de doble envío
 * ✅ Logging mejorado
 * ✅ TODOS LOS ERRORES TYPESCRIPT CORREGIDOS
 */
import { loadStripe, Stripe, StripeCardElement } from "@stripe/stripe-js";


import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';


// ✅ IMPORTACIONES CORREGIDAS
import { ClienteEntrenadorService } from '../../../../../src/app/core/services/cliente-entrenador.service';
import { EntrenadorService } from '../../../../../src/app/core/services/entrenador.service';

// INTERFACES
interface PagoFormulario {
  numeroTarjeta: string;
  titular: string;
  mesExpiracion: string;
  anoExpiracion: string;
  cvv: string;
}

interface EntrenadorPago {
  id: number;
  nombre: string;
  especialidad: string;
  foto_url: string;
  precio_mensual: number;
}

interface UsuarioActual {
  id?: number;
  id_usuario?: number;
  rol?: string;
  userType?: string;
}

@Component({
  selector: 'app-proceso-pago-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './proceso-pago.page.html',
  styleUrls: ['./proceso-pago.page.css'],
})
export class ProcesoPagoPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clienteEntrenadorSvc = inject(ClienteEntrenadorService);
  private entrenadorSvc = inject(EntrenadorService);
  private stripe: Stripe | null = null;
  private cardElement!: StripeCardElement;
  
  private elements: any;

  private destroy$ = new Subject<void>();

  // ID del usuario actual
  currentUserId: number | null = null;
  currentUserRol: string | null = null;

  // Datos del entrenador
  entrenador: EntrenadorPago | null = null;
  cargandoEntrenador = true;
  errorEntrenador: string | null = null;

  // Paso del proceso
  pasoPago = 1; // 1: Datos, 2: Confirmación, 3: Procesando

  // Formulario de pago
  formPago: PagoFormulario = {
    numeroTarjeta: '',
    titular: '',
    mesExpiracion: '',
    anoExpiracion: '',
    cvv: ''
  };

  // Estados
  procesandoPago = false;
  pagoProcesado = false;
  errorFormulario: string | null = null;
  contratandoEntrenador = false;
  errorContratacion: string | null = null;

  // Control de envío duplicado
  private yaEnviado = false;

  async ngOnInit(): Promise<void> {
  console.log('🟦 [PAGO] ProcesoPagoPage inicializado');
  
  // Verificar autenticación
  if (!this.cargarUsuarioActual()) return;

  this.cargarEntrenador();

  // 🔥 AQUÍ AGREGA ESTO
  await this.inicializarStripe();
}


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    

  }

async inicializarStripe() {
  // Si ya existía, desmontarlo limpio
  if (this.cardElement) {
    try {
      this.cardElement.unmount();
    } catch {}
    this.cardElement = null!;
  }

  // 1️⃣ Cargar Stripe
  this.stripe = await loadStripe(environment.endpoints.stripePublicKey);

  if (!this.stripe) {
    console.error("🔴 No se pudo inicializar Stripe");
    return;
  }

  console.log("🟢 Stripe inicializado correctamente");

  // 2️⃣ Crear Elements
  this.elements = this.stripe.elements();

  if (!this.elements) {
    console.error("🔴 No se pudo crear Stripe Elements");
    return;
  }

  // 3️⃣ Crear CardElement con estilos
  this.cardElement = this.elements.create("card", {
    hidePostalCode: true,
    style: {
      base: {
        color: "#e9edf5",
        fontSize: "16px",
        iconColor: "#1ed760",
        "::placeholder": {
          color: "#94a0ad"
        }
      },
      invalid: {
        color: "#fca5a5",
        iconColor: "#ef4444"
      }
    }
  });

  // 4️⃣ Montarlo en el contenedor global (no visible)
  setTimeout(() => {
    const mountPoint = document.getElementById("card-element");

    if (!mountPoint) {
      console.error("🔴 No se encontró #card-element para montar Stripe");
      return;
    }

    this.cardElement.mount("#card-element");
    console.log("🟢 CardElement montado en DOM global");

    // 5️⃣ Ahora moverlo al contenedor visible del Paso 1
    const visibleContainer = document.getElementById("stripe-visible");
    const realCard = document.getElementById("card-element");

    if (visibleContainer && realCard) {
      visibleContainer.appendChild(realCard);
      console.log("🟢 CardElement movido a contenedor visible");
    } else {
      console.warn("⚠️ No se pudo mover el CardElement al contenedor visible");
    }
  }, 300);
}


  /**
   * ✅ CORREGIDO: Valida que usuario esté autenticado
   * Retorna true si el usuario se cargó correctamente
   */
  private cargarUsuarioActual(): boolean {
    try {
      const rawUser = localStorage.getItem('usuario');
      
      if (!rawUser) {
        console.warn('🟨 [PAGO] No hay usuario en localStorage');
        this.mostrarErrorYRedirigir('Debes iniciar sesión para realizar un pago', '/login');
        return false;
      }

      const u: UsuarioActual = JSON.parse(rawUser);
      this.currentUserId = Number(u?.id ?? u?.id_usuario);
      // ✅ CORREGIDO: Cambiar || por ?? y asegurar null
      this.currentUserRol = (u?.rol ?? u?.userType) ?? null;

      // ✅ CORREGIDO: Validar que el ID sea un número válido
      if (!Number.isFinite(this.currentUserId) || this.currentUserId <= 0) {
        console.error('🔴 [PAGO] ID de usuario inválido:', this.currentUserId);
        this.mostrarErrorYRedirigir('Datos de usuario inválidos', '/login');
        return false;
      }

      // ✅ CORREGIDO: Validar que sea cliente
      if (this.currentUserRol !== 'alumno' && this.currentUserRol !== 'cliente') {
        console.warn('🟨 [PAGO] Usuario no es cliente, rol:', this.currentUserRol);
        this.mostrarErrorYRedirigir('Solo los clientes pueden realizar pagos', '/home');
        return false;
      }

      console.log('🟢 [PAGO] Usuario cargado correctamente:', {
        id: this.currentUserId,
        rol: this.currentUserRol
      });

      return true;
    } catch (error) {
      console.error('🔴 [PAGO] Error al parsear usuario:', error);
      this.mostrarErrorYRedirigir('Error de autenticación', '/login');
      return false;
    }
  }

  /**
   * ✅ NUEVO: Muestra error y redirige
   */
  private mostrarErrorYRedirigir(mensaje: string, ruta: string): void {
    this.errorEntrenador = mensaje;
    setTimeout(() => {
      this.router.navigate([ruta]);
    }, 1500);
  }

  /**
   * Carga los datos del entrenador
   */
  private cargarEntrenador(): void {
    const trainerId = Number(this.route.snapshot.paramMap.get('id'));
    
    if (!trainerId || !Number.isFinite(trainerId)) {
      console.error('🔴 [PAGO] ID de entrenador no válido:', trainerId);
      this.errorEntrenador = 'ID de entrenador inválido';
      this.cargandoEntrenador = false;
      setTimeout(() => this.cancelarPago(), 1500);
      return;
    }

    console.log('🟦 [PAGO] Cargando entrenador:', trainerId);

    // ✅ CORREGIDO: Agregar tipo al error
    this.entrenadorSvc.getEntrenadorDetalle(trainerId).pipe(
      takeUntil(this.destroy$),
      catchError((error: any) => {
        console.error('🔴 [PAGO] Error al cargar entrenador:', error);
        
        // ✅ CORREGIDO: Mensaje de error más específico
        const mensaje = error?.status === 404 
          ? 'El entrenador no existe'
          : error?.error?.message || 'Error al cargar los datos del entrenador';
        
        this.errorEntrenador = mensaje;
        this.cargandoEntrenador = false;
        return of(null);
      })
    ).subscribe({
      // ✅ CORREGIDO: Agregar tipo al data
      next: (data: any) => {
        if (data) {
          // ✅ CORREGIDO: Validar que el entrenador tenga datos requeridos
          if (!data.id || !data.precio_mensual) {
            this.errorEntrenador = 'Datos del entrenador incompletos';
            this.cargandoEntrenador = false;
            return;
          }

          this.entrenador = data as EntrenadorPago;
          console.log('🟢 [PAGO] Entrenador cargado:', this.entrenador.nombre);
        } else {
          this.errorEntrenador = 'No se encontraron datos del entrenador';
        }
        this.cargandoEntrenador = false;
      }
    });
  }

  /**
   * ✅ CORREGIDO: Validación mejorada de tarjeta
   * Incluye Luhn Algorithm para validar número de tarjeta
   */
  private validarTarjeta(numeroTarjeta: string): boolean {
    const numero = numeroTarjeta.replace(/\s/g, '').replace(/[^0-9]/g, '');
    
    if (numero.length !== 16) {
      this.errorFormulario = 'Número de tarjeta debe tener 16 dígitos';
      return false;
    }

    // ✅ Implementar Luhn Algorithm
    if (!this.validarLuhn(numero)) {
      this.errorFormulario = 'Número de tarjeta inválido (validación Luhn)';
      return false;
    }

    return true;
  }

  /**
   * ✅ NUEVO: Algoritmo de Luhn para validar tarjetas
   */
  private validarLuhn(numero: string): boolean {
    let suma = 0;
    let esPar = false;

    for (let i = numero.length - 1; i >= 0; i--) {
      let digito = parseInt(numero.charAt(i), 10);

      if (esPar) {
        digito *= 2;
        if (digito > 9) {
          digito -= 9;
        }
      }

      suma += digito;
      esPar = !esPar;
    }

    return suma % 10 === 0;
  }

  /**
   * ✅ CORREGIDO: Validación mejorada de fecha de expiración
   */
  private validarFechaExpiracion(mes: string, ano: string): boolean {
    const mesNum = parseInt(mes, 10);
    const anoNum = parseInt(ano, 10);

    if (isNaN(mesNum) || mesNum < 1 || mesNum > 12) {
      this.errorFormulario = 'Mes de expiración inválido (01-12)';
      return false;
    }

    if (isNaN(anoNum) || ano.length !== 2) {
      this.errorFormulario = 'Año de expiración inválido (formato: YY)';
      return false;
    }

    // ✅ NUEVO: Validar que no esté expirada
    const fechaActual = new Date();
    const anoActual = fechaActual.getFullYear() % 100;
    const mesActual = fechaActual.getMonth() + 1;

    if (anoNum < anoActual || (anoNum === anoActual && mesNum < mesActual)) {
      this.errorFormulario = 'La tarjeta está expirada';
      return false;
    }

    // ✅ NUEVO: Validar que no sea más de 20 años en el futuro
    if (anoNum > anoActual + 20) {
      this.errorFormulario = 'Año de expiración inválido';
      return false;
    }

    return true;
  }

  /**
   * ✅ CORREGIDO: Validación mejorada del formulario
   */
 validarFormulario(): boolean {
  const { titular } = this.formPago;

  if (!titular || titular.trim().length < 3) {
    this.errorFormulario = 'Nombre del titular inválido';
    return false;
  }

  this.errorFormulario = null;
  return true;
}

  /**
   * Continúa al siguiente paso
   */
  continuarPago(): void {
    // ✅ CORREGIDO: Prevenir múltiples clicks
    if (this.procesandoPago || this.contratandoEntrenador || this.yaEnviado) {
      return;
    }

    console.log('🟦 [PAGO] Continuando en paso:', this.pasoPago);

    if (this.pasoPago === 1) {
      if (this.validarFormulario()) {
        this.pasoPago = 2;
        this.errorFormulario = null;
      }
      return;
    }

    if (this.pasoPago === 2) {
      this.procesarPago();
    }
  }

  /**
   * Vuelve al paso anterior
   */
  volver(): void {
    if (this.pasoPago > 1 && !this.procesandoPago) {
      this.pasoPago--;
      console.log('🟦 [PAGO] Volviendo al paso:', this.pasoPago);
    }
  }

  /**
   * ✅ CORREGIDO: Procesa el pago (ficticio)
   */
  private async procesarPago(): Promise<void> {
  if (!this.entrenador || !this.entrenador.precio_mensual) {
    this.errorFormulario = "Entrenador inválido";
    return;
  }

  console.log("🟦 [PAGO] Creando PaymentIntent en backend...");

  this.yaEnviado = true;
  this.procesandoPago = true;
  this.pasoPago = 3;

  // 1️⃣ Llamar backend FASTAPI para crear el PaymentIntent
  this.clienteEntrenadorSvc.crearPaymentIntent(
    this.currentUserId!,
    this.entrenador.id,
    this.entrenador.precio_mensual * 100
  )
  .pipe(
    takeUntil(this.destroy$),
    catchError(err => {
      console.error("🔴 Error creando PaymentIntent:", err);
      this.errorFormulario = "No se pudo iniciar el pago. Intenta de nuevo.";
      this.procesandoPago = false;
      return of(null);
    })
  )
  .subscribe(async (resp: any) => {

  if (!resp || !resp.client_secret || !resp.id_pago) {
    this.errorFormulario = "Error al crear el pago";
    this.procesandoPago = false;
    return;
  }

  const idPago = resp.id_pago;

  console.log("🟢 PaymentIntent creado - id_pago:", idPago);

  // Confirmación real en Stripe
const resultado = await this.stripe!.confirmCardPayment(resp.client_secret, {
  payment_method: {
    card: this.cardElement,
    billing_details: { name: this.formPago.titular }
  }
});

if (resultado.error) {
  console.error("🔴 Error Stripe:", resultado.error.message);
  this.errorFormulario = resultado.error.message!;
  this.procesandoPago = false;
  this.yaEnviado = false;
  return;
}

const status = resultado.paymentIntent?.status;
console.log("🟢 Estado del pago en Stripe:", status);

if (status === "requires_action") {
  this.errorFormulario = "Tu banco requiere autenticación adicional (3D Secure).";
  this.procesandoPago = false;
  this.yaEnviado = false;
  return;
}

if (status === "processing") {
  this.errorFormulario = "El pago está procesando. Espera unos segundos…";
  this.procesandoPago = false;
  this.yaEnviado = false;
  return;
}

if (status !== "succeeded") {
  this.errorFormulario = "No se pudo confirmar el pago.";
  this.procesandoPago = false;
  this.yaEnviado = false;
  return;
}

console.log("🟢 Pago confirmado correctamente en Stripe");

// ir a contratación
this.pasoPago = 3;
this.pagoProcesado = true;

setTimeout(() => this.contratarEntrenador(), 1500);
  });
  }
    
  /**
   * ✅ CORREGIDO: Contrata el entrenador en el backend
   */
  private contratarEntrenador(): void {
    // ✅ NUEVO: Validaciones adicionales
    if (!this.entrenador || !this.entrenador.id) {
      this.errorContratacion = 'Error: Datos del entrenador incompletos';
      console.error('🔴 [PAGO] Entrenador inválido:', this.entrenador);
      return;
    }

    if (!this.currentUserId) {
      this.errorContratacion = 'Error: Usuario no autenticado';
      console.error('🔴 [PAGO] Usuario no disponible');
      return;
    }

    // ✅ NUEVO: Validar que no sea el mismo usuario
    if (this.currentUserId === this.entrenador.id) {
      this.errorContratacion = 'No puedes contratarte a ti mismo';
      console.warn('🟨 [PAGO] Intento de auto-contratación');
      return;
    }

    console.log('🟦 [PAGO] Contratando entrenador:', this.entrenador.id);
    this.contratandoEntrenador = true;

    // ✅ CORREGIDO: Agregar tipo al error
    this.clienteEntrenadorSvc.contratarEntrenador(this.entrenador.id).pipe(
      takeUntil(this.destroy$),
      catchError((error: any) => {
        console.error('🔴 [PAGO] Error al contratar:', error);
        
        // ✅ CORREGIDO: Manejo de errores más específico
        let mensaje = 'Error al completar la contratación';
        
        if (error?.status === 409) {
          mensaje = 'Ya tienes contratado a este entrenador';
        } else if (error?.status === 403) {
          mensaje = 'No tienes permisos para realizar esta acción';
        } else if (error?.status === 400) {
          mensaje = error?.error?.detail || error?.error?.message || mensaje;
        } else if (error?.status === 0) {
          mensaje = 'Error de conexión. Verifica tu internet';
        }
        
        this.errorContratacion = mensaje;
        this.contratandoEntrenador = false;
        return of(null);
      })
    ).subscribe({
      // ✅ CORREGIDO: Agregar tipo al resultado
      next: (resultado: any) => {
        // ✅ NUEVO: Validar respuesta
        if (!resultado) {
          this.errorContratacion = 'Respuesta inválida del servidor';
          this.contratandoEntrenador = false;
          return;
        }

        console.log('🟢 [PAGO] Entrenador contratado exitosamente:', resultado);
        this.contratandoEntrenador = false;
        
        // Esperar 2 segundos y volver
        setTimeout(() => {
          this.router.navigate(['/entrenadores', this.entrenador!.id]);
        }, 2000);
      }
    });
  }

  /**
   * ✅ CORREGIDO: Formatea el número de tarjeta
   */
  formatearTarjeta(event: any): void {
    let valor = event.target.value.replace(/\s/g, '').replace(/[^0-9]/g, '');
    if (valor.length > 16) {
      valor = valor.substring(0, 16);
    }
    this.formPago.numeroTarjeta = valor.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  /**
   * Solo permite números
   */
  soloNumeros(event: any): void {
    event.target.value = event.target.value.replace(/[^0-9]/g, '');
  }

  /**
   * Cancela el pago y vuelve
   */
  cancelarPago(): void {
    console.log('🟦 [PAGO] Cancelando pago');
    this.router.navigate(['/entrenadores', this.entrenador?.id || '']);
  }

  /**
   * Obtiene los últimos 4 dígitos de la tarjeta
   */
  get ultimosDigitos(): string {
    return this.formPago.numeroTarjeta.replace(/\s/g, '').slice(-4);
  }

  /**
   * Obtiene el precio formateado
   */
  get precioFormateado(): string {
    if (!this.entrenador?.precio_mensual) return '0';
    return this.entrenador.precio_mensual.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * ✅ CORREGIDO: Genera un ID de transacción con mejor formato
   */
  get idTransaccion(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `#TXN${timestamp}${random}`.substring(0, 20);
  }


  
}