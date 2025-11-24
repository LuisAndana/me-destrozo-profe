// features/auth/pages/pagina-principal-entrenador/pagina-principal-entrenador.ts
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { inject } from '@angular/core';
import { ClienteEntrenadorService } from '../../../../core/services/cliente-entrenador.service';
import { MensajesService } from '../../../../core/services/mensajes.service';
import { ResenaService } from '../../../../core/services/resena.service';
import { ConfirmLogoutModalComponent } from '../../../../core/confirm-logout-modal/confirm-logout-modal.component';

@Component({
  selector: 'app-pagina-principal-entrenador',
  standalone: true,
  imports: [CommonModule, RouterModule, ConfirmLogoutModalComponent],
  templateUrl: './pagina-principal-entrenador.html',
  styleUrls: ['./pagina-principal-entrenador.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaginaPrincipalEntrenador implements OnInit, OnDestroy {
  private clienteEntrenadorSvc = inject(ClienteEntrenadorService);
  private mensajesSvc = inject(MensajesService);
  private resenasSvc = inject(ResenaService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // ============================================================
  // UI STATE
  // ============================================================
  menuOpen = false;
  collapsed = false;
  showLogoutModal = signal(false);

  // ============================================================
  // USUARIO DATA
  // ============================================================
  nombre = 'Entrenador';
  inicial = 'E';
  fotoUrl = '';
  idUsuario = 0;

  // ============================================================
  // DATOS REALES - DINÁMICOS
  // ============================================================
  clientesActivos = 0;
  rating = '0.0';
  ratingStars = '⭐☆☆☆☆';
  mensajesNuevos = 0;
  totalResenas = 0;
  loading = signal(true);

  // ============================================================
  // LIFECYCLE
  // ============================================================
  ngOnInit(): void {
    console.log('🟢 [INIT] PaginaPrincipalEntrenador inicializado');
    this.cargarDatosUsuario();
    this.cargarDatos();
    this.suscribirMensajesNoLeidos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  /**
   * Carga datos del usuario desde localStorage
   */
  private cargarDatosUsuario(): void {
    try {
      const rawUser = localStorage.getItem('usuario');
      if (rawUser) {
        const usuario = JSON.parse(rawUser);
        this.idUsuario = usuario.id || usuario.id_usuario || 0;
        this.nombre = usuario.nombre || 'Entrenador';
        this.inicial = (usuario.nombre?.charAt(0) || 'E').toUpperCase();
        this.fotoUrl = usuario.foto_url || usuario.fotoUrl || '';
        
        console.log('✅ [Usuario] Cargado:', this.nombre, 'ID:', this.idUsuario);
      } else {
        console.warn('⚠️ [Usuario] No encontrado en localStorage');
      }
    } catch (error) {
      console.error('❌ [Error] Al cargar usuario:', error);
      this.nombre = 'Entrenador';
      this.inicial = 'E';
    }
  }

  /**
   * Carga todos los datos reales
   */
  private cargarDatos(): void {
    this.loading.set(true);
    
    // Cargar clientes activos
    this.cargarClientesActivos();
    
    // Cargar calificación
    this.cargarCalificacion();
    
    // Cargar mensajes nuevos
    this.cargarMensajesNuevos();
  }

  /**
   * Carga la cantidad de clientes activos desde la API
   */
  private cargarClientesActivos(): void {
    console.log('🟦 [CARGA] Obteniendo clientes activos...');
    
    this.clienteEntrenadorSvc.misClientes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clientes) => {
          this.clientesActivos = clientes?.length || 0;
          console.log('✅ [Clientes] Cantidad:', this.clientesActivos);
        },
        error: (err) => {
          console.error('❌ [Error] Al cargar clientes:', err);
          this.clientesActivos = 0;
        }
      });
  }

  /**
   * Carga la calificación del entrenador desde la API
   */
  private cargarCalificacion(): void {
    console.log('🟦 [CARGA] Obteniendo calificación del entrenador...');
    
    if (!this.idUsuario) {
      console.warn('⚠️ ID de usuario no disponible');
      return;
    }

    this.resenasSvc.obtenerEstadisticasEntrenador(this.idUsuario)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (estadisticas) => {
          // Obtener promedio de calificación
          this.rating = (estadisticas.promedio_calificacion || 0).toFixed(1);
          this.totalResenas = estadisticas.total_resenas || 0;
          
          // Convertir a estrellas
          this.ratingStars = this.generarEstrellas(parseFloat(this.rating));
          
          console.log('✅ [Calificación] Rating:', this.rating, 'Reseñas:', this.totalResenas);
        },
        error: (err) => {
          console.error('❌ [Error] Al cargar calificación:', err);
          this.rating = '0.0';
          this.ratingStars = '⭐☆☆☆☆';
          this.totalResenas = 0;
        }
      });
  }

  /**
   * Carga mensajes nuevos desde la API
   */
  private cargarMensajesNuevos(): void {
    console.log('🟦 [CARGA] Obteniendo mensajes nuevos...');
    
    if (!this.idUsuario) {
      console.warn('⚠️ ID de usuario no disponible');
      this.loading.set(false);
      return;
    }

    this.mensajesSvc.contarMensajesNoLeidos(this.idUsuario)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resultado) => {
          this.mensajesNuevos = resultado.no_leidos || 0;
          console.log('✅ [Mensajes] Nuevos:', this.mensajesNuevos);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('❌ [Error] Al cargar mensajes:', err);
          this.mensajesNuevos = 0;
          this.loading.set(false);
        }
      });
  }

  /**
   * Se suscribe al observable de mensajes no leídos para actualizaciones en tiempo real
   */
  private suscribirMensajesNoLeidos(): void {
    this.mensajesSvc.mensajesNoLeidos$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cantidad) => {
          this.mensajesNuevos = cantidad;
          console.log('📬 [Mensajes] Actualizado a:', cantidad);
        },
        error: (err) => console.error('❌ Error en suscripción mensajes:', err)
      });
  }

  /**
   * Convierte un número a estrellas
   */
  private generarEstrellas(rating: number): string {
    const llenas = Math.round(rating);
    const vacías = 5 - llenas;
    return '⭐'.repeat(Math.min(llenas, 5)) + '☆'.repeat(Math.max(vacías, 0));
  }

  // ============================================================
  // PUBLIC METHODS - LOGOUT MODAL
  // ============================================================

  /**
   * Abre el modal de confirmación de logout
   */
  openLogoutModal(): void {
    console.log('🟦 [Modal] Abriendo modal de logout...');
    this.showLogoutModal.set(true);
  }

  /**
   * Confirma el logout y redirige a bienvenida
   */
  confirmLogout(): void {
    console.log('🟦 [LOGOUT] Cerrando sesión...');
    localStorage.removeItem('token');
    localStorage.removeItem('gym_token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('gym_user');
    this.showLogoutModal.set(false);
    this.router.navigate(['/bienvenida'], { replaceUrl: true });
  }

  /**
   * Cancela el logout y cierra el modal
   */
  cancelLogout(): void {
    console.log('🟦 [Modal] Cerrando modal de logout...');
    this.showLogoutModal.set(false);
  }
}