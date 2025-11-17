// src/app/components/mensajes/nueva-conversacion/nueva-conversacion.component.ts

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ClienteEntrenadorService } from '../../../../../core/services/cliente-entrenador.service';
import { MensajesService } from '../../../../../core/services/mensajes.service';

interface ContactoDisponible {
  id_usuario: number;
  nombre: string;
  apellido?: string;
  foto_url?: string;
  rol?: string;
  email?: string;
}

@Component({
  selector: 'app-nueva-conversacion',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './nueva-conversacion.component.html',
  styleUrls: ['./nueva-conversacion.component.css']
})
export class NuevaConversacionComponent implements OnInit, OnDestroy {

  private clienteEntrenadorService = inject(ClienteEntrenadorService);
  private mensajesService = inject(MensajesService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // Datos
  contactosDisponibles: ContactoDisponible[] = [];
  contactosFiltrados: ContactoDisponible[] = [];

  // UI
  cargando = true;
  error: string | null = null;
  busqueda = '';

  // Usuario actual
  idUsuarioActual!: number;
  rolUsuarioActual = '';

  defaultAvatar =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%236366f1" width="100" height="100"/%3E%3Ctext x="50" y="50" font-size="40" fill="white" text-anchor="middle" dy=".3em"%3E?%3C/text%3E%3C/svg%3E';

  ngOnInit(): void {
    console.log('✏️ [INIT] NuevaConversacionComponent');
    this.obtenerInfoUsuarioActual();
    this.cargarContactosDisponibles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * 🆔 Cargar usuario desde localStorage
   */
  private obtenerInfoUsuarioActual(): void {
    try {
      const usuarioStr = localStorage.getItem('usuario');

      if (!usuarioStr) {
        this.error = 'No se pudo identificar al usuario actual';
        this.cargando = false;
        return;
      }

      const usuario = JSON.parse(usuarioStr);

      this.idUsuarioActual = usuario.id || usuario.id_usuario || 0;
      this.rolUsuarioActual = usuario.rol || '';

      console.log('👤 Usuario actual:', {
        id: this.idUsuarioActual,
        rol: this.rolUsuarioActual
      });

    } catch (error) {
      console.error('❌ Error al obtener usuario:', error);
      this.error = 'Error al obtener información del usuario';
      this.cargando = false;
    }
  }

  /**
   * 📥 Cargar contactos dependiendo del rol
   */
  private cargarContactosDisponibles(): void {

    if (!this.idUsuarioActual) {
      this.error = 'Usuario no identificado';
      this.cargando = false;
      return;
    }

    this.cargando = true;

    if (this.rolUsuarioActual === 'entrenador' || this.rolUsuarioActual === 'trainer') {
      this.cargarClientes();
    } else {
      this.cargarEntrenador();
    }
  }

  /**
   * 👥 Cargar clientes del entrenador
   */
  private cargarClientes(): void {

    this.clienteEntrenadorService.misClientes(this.idUsuarioActual)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clientes) => {

          this.contactosDisponibles = clientes.map(c => ({
            id_usuario: c.cliente.id_usuario,
            nombre: c.cliente.nombre,
            apellido: c.cliente.apellido ?? '',   // 🔥 FIX
            foto_url: c.cliente.foto_url,
            rol: 'cliente',
            email: c.cliente.email
          }));

          this.contactosFiltrados = [...this.contactosDisponibles];
          this.cargando = false;
        },
        error: (error) => {
          console.error('❌ Error al cargar clientes:', error);
          this.error = 'No se pudieron cargar los clientes';
          this.cargando = false;
        }
      });
  }

  /**
   * 👤 Cargar entrenador del cliente
   */
  private cargarEntrenador(): void {

    this.clienteEntrenadorService.miEntrenador(this.idUsuarioActual)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (entrenador) => {

          if (entrenador) {
            this.contactosDisponibles = [{
              id_usuario: entrenador.entrenador.id_usuario,
              nombre: entrenador.entrenador.nombre,
              apellido: '',  // no existe en este endpoint
              foto_url: entrenador.entrenador.foto_url,
              rol: 'entrenador',
              email: entrenador.entrenador.email
            }];
          } else {
            this.contactosDisponibles = [];
          }

          this.contactosFiltrados = [...this.contactosDisponibles];
          this.cargando = false;
        },
        error: (error) => {
          console.error('❌ Error al cargar entrenador:', error);
          this.error = 'No se pudo cargar el entrenador';
          this.cargando = false;
        }
      });
  }

  /**
   * 🔍 Filtrar contactos
   */
  filtrarContactos(): void {
    const q = this.busqueda.toLowerCase().trim();

    if (!q) {
      this.contactosFiltrados = [...this.contactosDisponibles];
      return;
    }

    this.contactosFiltrados = this.contactosDisponibles.filter(c => {
      const nombreCompleto = this.obtenerNombreCompleto(c).toLowerCase();
      const email = (c.email || '').toLowerCase();

      return nombreCompleto.includes(q) || email.includes(q);
    });
  }

  limpiarBusqueda(): void {
    this.busqueda = '';
    this.filtrarContactos();
  }

  iniciarConversacion(contacto: ContactoDisponible): void {
    this.router.navigate(['/mensajes/chat', contacto.id_usuario]);
  }

  volver(): void {
    this.router.navigate(['/mensajes']);
  }

  recargar(): void {
    this.cargarContactosDisponibles();
  }

  obtenerIniciales(contacto: ContactoDisponible): string {
    return this.mensajesService.obtenerIniciales(contacto);
  }

  obtenerNombreCompleto(contacto: ContactoDisponible): string {
    return this.mensajesService.obtenerNombreCompleto(contacto);
  }

  onImageError(event: any): void {
    event.target.src = this.defaultAvatar;
  }
}
