import { Component, ChangeDetectorRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-pagina-principal-entrenador',
  templateUrl: './pagina-principal-entrenador.html',
  // 1) Reutilizamos el CSS del cliente
  // 2) Añadimos un CSS corto con ajustes específicos del entrenador
  styleUrls: [
    '../pagina-principal-cliente/pagina-principal-cliente.css', // <-- ajusta la ruta si cambia
    './pagina-principal-entrenador.css'
  ],
  imports: [CommonModule, RouterModule, RouterOutlet, RouterLink, RouterLinkActive],
})
export class PaginaPrincipalEntrenador implements OnInit {
  menuOpen = false;
  collapsed = false;

  nombre = 'Entrenador';
  inicial = 'E';
  fotoUrl = '';

  // métricas simples (placeholder)
  sesionesHoy = 0;
  mensajesNuevos = 0;
  clientesActivos = 0;

  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  ngOnInit(): void {
    try {
      const raw = localStorage.getItem('usuario');
      if (!raw) {
        this.router.navigate(['/']);
        return;
      }

      const u = JSON.parse(raw) as {
        id?: number; nombre?: string; apellido?: string; email?: string; fotoUrl?: string; rol?: string;
      };

      const full = [u?.nombre, u?.apellido].filter(Boolean).join(' ').trim();
      this.nombre = full || u?.nombre || this.nombre;

      const partes = this.nombre.split(' ');
      this.inicial = (partes[0]?.charAt(0) || 'E').toUpperCase() + (partes[1]?.charAt(0) || '').toUpperCase();

      this.fotoUrl = (u?.fotoUrl && u.fotoUrl.trim() !== '') ? u.fotoUrl : '';

      // (Opcional) si guardas métricas en LS / API, cárgalas aquí.
      // this.sesionesHoy = ...
      // this.mensajesNuevos = ...
      // this.clientesActivos = ...
    } catch {
      this.router.navigate(['/']);
    }

    setTimeout(() => this.cd.detectChanges(), 0);
  }

  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  toggleCollapse(): void { this.collapsed = !this.collapsed; }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/']);
  }
}
