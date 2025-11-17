// pagina-principal-cliente.component.ts
import { Component, ChangeDetectorRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterModule,
  RouterOutlet,
  RouterLink,
  RouterLinkActive
} from '@angular/router';

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
    RouterLinkActive
  ],
})
export class PaginaPrincipalCliente implements OnInit {
  // ============================================================
  // PROPIEDADES
  // ============================================================
  nombre = 'Usuario';
  inicial = 'U';
  fotoUrl = '';

  // Propiedades para el template (sin inventar datos)
  tieneRutinaActiva = false;   // Se actualizará cuando se implemente el servicio
  mensajesNuevos = 0;           // Se actualizará cuando se implemente el servicio

  // Inyección de dependencias
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================
  ngOnInit(): void {
    this.cargarDatosUsuario();
    // TODO: Implementar carga de datos reales cuando estén disponibles los servicios
    // this.cargarRutinaActiva();
    // this.cargarMensajes();
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
  // MÉTODOS PÚBLICOS (para uso futuro)
  // ============================================================

  /**
   * TODO: Implementar cuando esté disponible el servicio de rutinas
   * Verifica si el cliente tiene una rutina activa
   */
  private cargarRutinaActiva(): void {
    // Implementar llamada al servicio
    // this.rutinaService.obtenerRutinaActiva(this.idCliente).subscribe({
    //   next: (rutina) => {
    //     this.tieneRutinaActiva = !!rutina;
    //   },
    //   error: (err) => {
    //     console.error('Error al cargar rutina:', err);
    //   }
    // });
  }

  /**
   * TODO: Implementar cuando esté disponible el servicio de mensajes
   * Carga el número de mensajes no leídos
   */
  private cargarMensajes(): void {
    // Implementar llamada al servicio
    // this.mensajesService.obtenerNoLeidos(this.idCliente).subscribe({
    //   next: (mensajes) => {
    //     this.mensajesNuevos = mensajes.length;
    //   },
    //   error: (err) => {
    //     console.error('Error al cargar mensajes:', err);
    //   }
    // });
  }

  // ============================================================
  // MÉTODOS DE NAVEGACIÓN (si son necesarios desde el TypeScript)
  // ============================================================

  /**
   * Navega a la página de rutina del cliente
   */
  verRutina(): void {
    this.router.navigate(['/cliente/rutina']);
  }

  /**
   * Navega a la página de calificación
   */
  calificar(): void {
    this.router.navigate(['/cliente/calificar']);
  }

  /**
   * Navega a la página de mensajes
   */
  verMensajes(): void {
    this.router.navigate(['/cliente/mensajes']);
  }

  /**
   * Navega al perfil del cliente
   */
  irAPerfil(): void {
    this.router.navigate(['/cliente/perfil']);
  }
}