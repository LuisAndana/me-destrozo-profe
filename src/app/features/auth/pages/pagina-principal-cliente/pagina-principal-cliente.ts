import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-pagina-principal-cliente',
  templateUrl: './pagina-principal-cliente.html',
  styleUrls: ['./pagina-principal-cliente.css'],
  imports: [CommonModule, RouterLink, RouterLinkActive],
})
export class PaginaPrincipalCliente implements OnInit {
  // Estados de UI
  menuOpen = false;   // off-canvas en móvil
  collapsed = false;  // sidebar colapsado en desktop

  // Datos mostrados en la cabecera/menú
  nombre = 'Usuario';
  inicial = 'U';
  fotoUrl = 'assets/img/alumno.jpg';

  constructor(private router: Router) {}

  ngOnInit(): void {
    try {
      const raw = localStorage.getItem('usuario');
      if (raw) {
        const u = JSON.parse(raw) as { nombre?: string; apellido?: string; fotoUrl?: string };
        const full = [u?.nombre, u?.apellido].filter(Boolean).join(' ').trim();
        this.nombre = full || u?.nombre || this.nombre;
        this.inicial = (this.nombre || 'U').trim().charAt(0).toUpperCase();
        if (u?.fotoUrl) this.fotoUrl = u.fotoUrl;
      }
    } catch (e) {
      console.warn('[Cliente] no se pudo leer usuario de localStorage:', e);
    }
  }

  // Acciones de UI
  toggleMenu(): void { this.menuOpen = !this.menuOpen; }       // móvil
  toggleCollapse(): void { this.collapsed = !this.collapsed; } // desktop

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/']);
  }
}
