// features/auth/pages/pagina-principal-cliente/pagina-principal-cliente.component.ts
import { Component, ChangeDetectorRef, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterModule,
  RouterOutlet,
  RouterLink,
  RouterLinkActive
} from '@angular/router';
import { ConfirmLogoutModalComponent } from '../../../../core/confirm-logout-modal/confirm-logout-modal.component';

@Component({
  standalone: true,
  selector: 'app-pagina-principal-cliente',
  templateUrl: './pagina-principal-cliente.html',
  styleUrls: ['./pagina-principal-cliente.css'],
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ConfirmLogoutModalComponent
  ],
})
export class PaginaPrincipalCliente implements OnInit {
  // ============================================================
  // PROPIEDADES
  // ============================================================
  nombre = 'Usuario';
  inicial = 'U';
  fotoUrl = '';
  showLogoutModal = signal(false);

  // Propiedades para el template (sin inventar datos)
  tieneRutinaActiva = false;
  mensajesNuevos = 0;

  // Inyección de dependencias
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================
  ngOnInit(): void {
    this.cargarDatosUsuario();
  }

  // ============================================================
  // MÉTODOS PRIVADOS
  // ============================================================
  
  /**
   * Carga los datos del usuario desde localStorage
   */
  private cargarDatosUsuario(): void {
    try {
      const raw = localStorage.getItem('usuario');

      // Si no hay usuario, redirigir al login
      if (!raw) {
        console.warn('No hay usuario logeado, redirigiendo al login...');
        this.router.navigate(['/']);
        return;
      }

      const usuario = JSON.parse(raw) as {
        id?: number;
        nombre?: string;
        apellido?: string;
        email?: string;
        fotoUrl?: string;
      };

      // Construir nombre completo
      const nombreCompleto = [usuario?.nombre, usuario?.apellido]
        .filter(Boolean)
        .join(' ')
        .trim();
      
      this.nombre = nombreCompleto || usuario?.nombre || this.nombre;

      // Obtener iniciales (1 o 2 letras)
      const partes = this.nombre.split(' ');
      if (partes.length >= 2) {
        this.inicial = (partes[0][0] + partes[1][0]).toUpperCase();
      } else {
        this.inicial = (partes[0]?.charAt(0) || 'U').toUpperCase();
      }

      // Asignar foto si existe
      this.fotoUrl = (usuario?.fotoUrl && usuario.fotoUrl.trim() !== '') 
        ? usuario.fotoUrl 
        : '';

      // Forzar detección de cambios
      setTimeout(() => this.cd.detectChanges(), 0);

    } catch (error) {
      console.error('[Cliente] Error al cargar datos de usuario:', error);
      this.router.navigate(['/']);
    }
  }

  // ============================================================
  // MÉTODOS DE LOGOUT
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

  // ============================================================
  // MÉTODOS DE NAVEGACIÓN
  // ============================================================

  /**
   * Navega a la página de rutina del cliente
   * Ruta correcta: /rutina
   */
  verRutina(): void {
    console.log('✅ Navegando a /rutina');
    this.router.navigate(['/rutina']);
  }

  /**
   * Navega a la página de entrenadores para calificar
   * Ruta correcta: /entrenadores
   */
  calificar(): void {
    console.log('✅ Navegando a /entrenadores');
    this.router.navigate(['/entrenadores']);
  }

  /**
   * Navega a la página de mensajes
   * Ruta correcta: /mensajes
   */
  verMensajes(): void {
    console.log('✅ Navegando a /mensajes');
    this.router.navigate(['/mensajes']);
  }

  /**
   * Navega al perfil del cliente
   * Ruta correcta: /perfil
   */
  irAPerfil(): void {
    console.log('✅ Navegando a /perfil');
    this.router.navigate(['/perfil']);
  }
}