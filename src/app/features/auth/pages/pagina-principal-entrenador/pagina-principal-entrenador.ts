// features/auth/pages/pagina-principal-entrenador/pagina-principal-entrenador.ts
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { inject } from '@angular/core';
import { ClienteEntrenadorService } from '../../../../core/services/cliente-entrenador.service';

// ✨ IMPORTACIÓN CORRECTA DEL MODAL (VERIFICA LA RUTA)
import { ConfirmLogoutModalComponent } from '../../../../core/confirm-logout-modal/confirm-logout-modal.component';

@Component({
  selector: 'app-pagina-principal-entrenador',
  standalone: true,
  // ✨ IMPORTANTE: Agregar el modal al array de imports
  imports: [CommonModule, RouterModule, ConfirmLogoutModalComponent],
  templateUrl: './pagina-principal-entrenador.html',
  styleUrls: ['./pagina-principal-entrenador.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaginaPrincipalEntrenador implements OnInit, OnDestroy {
  private clienteEntrenadorSvc = inject(ClienteEntrenadorService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // ============================================================
  // UI STATE
  // ============================================================
  menuOpen = false;
  collapsed = false;
  
  // ✨ SIGNAL PARA CONTROLAR SI EL MODAL ESTÁ ABIERTO
  showLogoutModal = signal(false);

  // ============================================================
  // USUARIO DATA
  // ============================================================
  nombre = 'Entrenador';
  inicial = 'E';
  fotoUrl = '';

  // ============================================================
  // TRAINER DATA
  // ============================================================
  sesionesHoy = 0;
  clientesActivos = 0;
  mensajesNuevos = 0;
  rating = 4.8;

  // ============================================================
  // LIFECYCLE
  // ============================================================
  ngOnInit(): void {
    console.log('🟢 [INIT] PaginaPrincipalEntrenador inicializado');
    this.cargarDatosUsuario();
    this.cargarClientesActivos();
    this.cargarEstadisticas();
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
        this.nombre = usuario.nombre || 'Entrenador';
        this.inicial = (usuario.nombre?.charAt(0) || 'E').toUpperCase();
        this.fotoUrl = usuario.foto_url || usuario.fotoUrl || '';
        
        console.log('✅ [Usuario] Cargado:', this.nombre);
        console.log('📸 [Foto] URL:', this.fotoUrl);
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
   * Carga la cantidad de clientes activos
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
   * Carga estadísticas generales
   */
  private cargarEstadisticas(): void {
    console.log('🟦 [CARGA] Cargando estadísticas...');
    
    // Sesiones de hoy
    this.sesionesHoy = 0;
    
    // Mensajes nuevos
    this.mensajesNuevos = 0;
    
    // Calificación
    this.rating = 4.8;
  }

  // ============================================================
  // PUBLIC METHODS - UI CONTROL
  // ============================================================

  /**
   * Alterna el colapso del menú
   */
  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    console.log('🟦 [Sidebar] Colapsado:', this.collapsed);
  }

  /**
   * Abre/cierra el menú móvil
   */
  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  // ============================================================
  // PUBLIC METHODS - LOGOUT MODAL
  // ============================================================

  /**
   * ✨ ABRE EL MODAL DE CONFIRMACIÓN DE LOGOUT
   * Se ejecuta cuando el usuario hace click en "Salir"
   */
  openLogoutModal(): void {
    console.log('🟦 [Modal] Abriendo modal de logout...');
    this.showLogoutModal.set(true);
  }

  /**
   * ✨ CONFIRMA EL LOGOUT Y REDIRIGE A BIENVENIDA
   * Se ejecuta cuando el usuario hace click en "Sí, cerrar sesión"
   */
  confirmLogout(): void {
    console.log('🟦 [LOGOUT] Cerrando sesión...');
    
    // Limpiar todos los datos del usuario
    localStorage.removeItem('token');
    localStorage.removeItem('gym_token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('gym_user');
    
    // Cerrar modal y redirigir
    this.showLogoutModal.set(false);
    this.router.navigate(['/bienvenida'], { replaceUrl: true });
  }

  /**
   * ✨ CANCELA EL LOGOUT Y CIERRA EL MODAL
   * Se ejecuta cuando el usuario hace click en "Cancelar"
   */
  cancelLogout(): void {
    console.log('🟦 [Modal] Cerrando modal de logout...');
    this.showLogoutModal.set(false);
  }
}