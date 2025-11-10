// features/auth/pages/pagina-principal-entrenador/pagina-principal-entrenador.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { inject } from '@angular/core';
import { ClienteEntrenadorService } from '../../../../../../src/app/core/services/cliente-entrenador.service';

@Component({
  selector: 'app-pagina-principal-entrenador',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pagina-principal-entrenador.html',
  styleUrls: ['./pagina-principal-entrenador.css']
})
export class PaginaPrincipalEntrenador implements OnInit, OnDestroy {
  private clienteEntrenadorSvc = inject(ClienteEntrenadorService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // UI
  menuOpen = false;
  collapsed = false;

  // Usuario
  nombre = '';
  inicial = '';
  fotoUrl = '';

  // Datos del entrenador
  sesionesHoy = 0;
  clientesActivos = 0;
  mensajesNuevos = 0;

  ngOnInit(): void {
    console.log('🟦 [INIT] PaginaPrincipalEntrenador inicializado');
    this.cargarDatosUsuario();
    this.cargarClientesActivos();
    this.cargarEstadisticas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

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
        this.fotoUrl = usuario.foto_url || '';
        console.log('✅ Usuario cargado:', this.nombre);
      }
    } catch (error) {
      console.error('❌ Error al cargar usuario:', error);
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
          this.clientesActivos = clientes.length;
          console.log('✅ Clientes activos:', this.clientesActivos);
        },
        error: (err) => {
          console.error('❌ Error al cargar clientes:', err);
          this.clientesActivos = 0;
        }
      });
  }

  /**
   * Carga estadísticas generales
   */
  private cargarEstadisticas(): void {
    console.log('🟦 [CARGA] Cargando estadísticas...');
    
    // Sesiones de hoy (simulado, puedes conectar a un servicio real)
    this.sesionesHoy = 0;
    
    // Mensajes nuevos (simulado, puedes conectar a un servicio real)
    this.mensajesNuevos = 0;
  }

  /**
   * Alterna el colapso del menú
   */
  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    console.log('🟦 Menú colapsado:', this.collapsed);
  }

  /**
   * Cierra sesión
   */
  logout(): void {
    console.log('🟦 [LOGOUT] Cerrando sesión...');
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/login']);
  }
}