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

import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { of } from 'rxjs';

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

  ngOnInit(): void {
    console.log('🟦 [PAGO] ProcesoPagoPage inicializado');
    
    // Verificar autenticación primero
    if (!this.cargarUsuarioActual()) {
      return; // Usuario no autenticado, salir
    }

    this.cargarEntrenador();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    const { numeroTarjeta, titular, mesExpiracion, anoExpiracion, cvv } = this.formPago;

    // Validar tarjeta
    if (!this.validarTarjeta(numeroTarjeta)) {
      return false;
    }

    // ✅ CORREGIDO: Validar titular
    if (!titular || titular.trim().length < 3) {
      this.errorFormulario = 'Nombre del titular inválido (mínimo 3 caracteres)';
      return false;
    }

    // Solo letras y espacios
    if (!/^[a-zA-Z\s]+$/.test(titular)) {
      this.errorFormulario = 'Nombre del titular solo puede contener letras';
      return false;
    }

    // Validar fecha de expiración
    if (!this.validarFechaExpiracion(mesExpiracion, anoExpiracion)) {
      return false;
    }

    // ✅ CORREGIDO: Validar CVV (3 o 4 dígitos)
    const cvvNum = cvv.replace(/[^0-9]/g, '');
    if (cvvNum.length < 3 || cvvNum.length > 4) {
      this.errorFormulario = 'CVV inválido (3-4 dígitos)';
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
  private procesarPago(): void {
    console.log('🟦 [PAGO] Procesando pago...');
    
    // ✅ NUEVO: Prevenir doble envío
    if (this.yaEnviado) {
      console.warn('🟨 [PAGO] Pago ya fue enviado');
      return;
    }

    this.yaEnviado = true;
    this.procesandoPago = true;
    this.pasoPago = 3;

    // Simular procesamiento de pago (2 segundos)
    setTimeout(() => {
      this.procesandoPago = false;
      this.pagoProcesado = true;
      console.log('🟢 [PAGO] Pago procesado exitosamente');

      // Después de 2 segundos, contratar el entrenador
      setTimeout(() => {
        this.contratarEntrenador();
      }, 2000);
    }, 2000);
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