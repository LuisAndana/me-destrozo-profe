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
  menuOpen = false;
  collapsed = false;
  nombre = 'Usuario';
  inicial = 'U';
  fotoUrl = '';

  // ✅ Propiedades usadas por el template
  clientesActivos = 0;   // puede quedarse en 0 para el rol cliente
  mensajesNuevos = 0;

  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  ngOnInit(): void {
    try {
      const raw = localStorage.getItem('usuario');

      // ✅ Si no hay usuario, redirigir al login
      if (!raw) {
        console.warn('No hay usuario logeado, redirigiendo al login...');
        this.router.navigate(['/']);
        return;
      }

      const u = JSON.parse(raw) as {
        id?: number;
        nombre?: string;
        apellido?: string;
        email?: string;
        fotoUrl?: string;
      };

      // ✅ Construir nombre completo
      const full = [u?.nombre, u?.apellido].filter(Boolean).join(' ').trim();
      this.nombre = full || u?.nombre || this.nombre;

      // ✅ Obtener iniciales (1 o 2 letras)
      const partes = this.nombre.split(' ');
      if (partes.length >= 2) {
        this.inicial = (partes[0][0] + partes[1][0]).toUpperCase();
      } else {
        this.inicial = (partes[0]?.charAt(0) || 'U').toUpperCase();
      }

      // ✅ Asignar foto si existe
      this.fotoUrl = (u?.fotoUrl && u.fotoUrl.trim() !== '') ? u.fotoUrl : '';

      // (Opcional) Cargar contadores reales
      // this.cargarResumen();
    } catch (e) {
      console.warn('[Cliente] No se pudo leer usuario de localStorage:', e);
      this.router.navigate(['/']);
    }

    setTimeout(() => this.cd.detectChanges(), 0);
  }

  // (Opcional) Hook para traer datos reales en el futuro
  // private cargarResumen(): void {
  //   // TODO: Llamar servicio para mensajes no leídos, etc.
  //   // this.mensajesNuevos = resp.noLeidos ?? 0;
  //   // this.clientesActivos = resp.clientesActivos ?? 0; // si aplica para cliente
  // }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/']);
  }

  // ✅ Navegar al perfil de cliente
  goToProfile(): void {
    this.router.navigate(['/cliente/perfil']);
  }
}
