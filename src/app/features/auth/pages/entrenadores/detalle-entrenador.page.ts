// detalle-entrenador.page.ts - ✅ CORREGIDO
/**
 * Página de detalle de un entrenador
 * Funcionalidades:
 * - Ver información completa del entrenador
 * - Botón para ir a página de pago (si eres cliente)
 * - Mostrar si ya está contratado
 */

import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { map, switchMap, takeUntil, catchError } from 'rxjs/operators';
import { EntrenadorService } from '../../../../core/services/entrenador.service';
import { ClienteEntrenadorService } from '../../../../core/services/cliente-entrenador.service';
import { TrainerDetail } from '../../../../core/models/trainer.model';
import { Observable, of, Subject, BehaviorSubject } from 'rxjs';
import { ResenasEntrenadorComponent } from '../resenas/resenas-entrenador/resenas-entrenador.component';
@Component({
  selector: 'app-detalle-entrenador-page',
  standalone: true,
  imports: [CommonModule, ResenasEntrenadorComponent, RouterModule],
  templateUrl: './detalle-entrenador.page.html',
  styleUrls: ['./detalle-entrenador.page.css'],
})
export class DetalleEntrenadorPage implements OnInit, OnDestroy {
  // Inyectar dependencias
  private route = inject(ActivatedRoute);
  private svc = inject(EntrenadorService);
  private clienteEntrenadorSvc = inject(ClienteEntrenadorService);
  private router = inject(Router);

  // Subject para manejar desuscripción
  private destroy$ = new Subject<void>();

  // ID del usuario actual (si existe)
  currentUserId: number | null = null;
  currentUserRol: string | null = null;

  // Observable para obtener datos del entrenador
  vm$: Observable<TrainerDetail> = this.route.paramMap.pipe(
    map(pm => Number(pm.get('id'))),
    switchMap(id => this.svc.getEntrenadorDetalle(id))
  );

  // ✅ MEJORADO: Usar BehaviorSubject para mayor control
  yaContratado$ = new BehaviorSubject<boolean>(false);

  // Estados
  contratando = false;
  errorContrato: string | null = null;
  sucessoContrato = false;

  ngOnInit(): void {
    console.log('🟦 [INIT] DetalleEntrenadorPage inicializado');
    
    this.cargarUsuarioActual();
    this.inicializarObservable();
  }

  /**
   * Inicializa el observable de contratación
   */
  private inicializarObservable(): void {
    console.log('🟦 [INIT] Inicializando observable de contratación');
    
    this.route.paramMap.pipe(
      map(pm => Number(pm.get('id'))),
      switchMap(trainerId => {
        console.log('🟦 [OBSERVABLE] TrainerId:', trainerId, 'CurrentUserId:', this.currentUserId);
        
        if (!this.currentUserId) {
          console.warn('🟨 [OBSERVABLE] Sin usuario, retornando false');
          this.yaContratado$.next(false);
          return of(false);
        }
        
        console.log('🟦 [OBSERVABLE] Verificando si tiene entrenador:', trainerId);
        return this.clienteEntrenadorSvc.tengoEsteEntrenador(trainerId).pipe(
          catchError(error => {
            console.error('🔴 [OBSERVABLE] Error:', error);
            this.yaContratado$.next(false);
            return of(false);
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (resultado) => {
        console.log('🟢 [OBSERVABLE] Resultado:', resultado);
        this.yaContratado$.next(resultado);
      },
      error: (error) => {
        console.error('🔴 [OBSERVABLE] Error en suscripción:', error);
        this.yaContratado$.next(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga los datos del usuario actual desde localStorage
   */
  private cargarUsuarioActual(): void {
    try {
      const rawUser = localStorage.getItem('usuario');
      console.log('🟦 [USER] RawUser:', rawUser ? 'EXISTS' : 'NOT FOUND');
      
      if (rawUser) {
        const u = JSON.parse(rawUser);
        this.currentUserId = Number(u?.id ?? u?.id_usuario);
        this.currentUserRol = u?.rol || u?.userType;

        console.log('🟢 [USER] Usuario cargado:', {
          id: this.currentUserId,
          rol: this.currentUserRol,
          esCliente: this.esCliente()
        });

        if (!Number.isFinite(this.currentUserId)) {
          console.warn('🟨 [USER] ID no válido');
          this.currentUserId = null;
        }
      } else {
        console.warn('🟨 [USER] No hay usuario en localStorage');
      }
    } catch (error) {
      console.error('🔴 [USER] Error al cargar usuario:', error);
      this.currentUserId = null;
    }
  }

  /**
   * Verifica si el usuario es cliente
   */
  esCliente(): boolean {
    const result = this.currentUserRol === 'alumno' || this.currentUserRol === 'cliente';
    console.log('🟦 [CHECK] esCliente():', result, 'rol:', this.currentUserRol);
    return result;
  }

  /**
   * Verifica si el usuario es entrenador
   */
  esEntrenador(): boolean {
    return this.currentUserRol === 'entrenador';
  }

  /**
   * Navega a la página de edición del perfil
   */
  editar(): void {
    this.router.navigate(['/entrenador/perfil']);
  }

  /**
   * ✅ CORREGIDO: Solo redirige a la página de pago sin validaciones
   */
  contratarEntrenador(trainerId: number): void {
    console.log('🟦 [CONTRATAR] Redirigiendo a pago para trainerId:', trainerId);
    this.router.navigate(['/pago', trainerId]);
  }

  /**
   * Recarga el estado de contratación
   */
  private recargarEstadoContratacion(): void {
    console.log('🟦 [RELOAD] Recargando estado de contratación...');
    
    if (!this.currentUserId) {
      this.yaContratado$.next(false);
      return;
    }

    const trainerId = Number(this.route.snapshot.paramMap.get('id'));
    
    this.clienteEntrenadorSvc.tengoEsteEntrenador(trainerId).pipe(
      catchError(error => {
        console.error('🔴 [RELOAD] Error:', error);
        return of(true);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (resultado) => {
        console.log('🟢 [RELOAD] Resultado:', resultado);
        this.yaContratado$.next(resultado);
      }
    });
  }

  /**
   * Muestra un mensaje de error
   */
  private mostrarError(mensaje: string): void {
    this.errorContrato = mensaje;
    console.error('🔴 [ERROR]:', mensaje);
    
    setTimeout(() => {
      this.errorContrato = null;
    }, 5000);
  }
}