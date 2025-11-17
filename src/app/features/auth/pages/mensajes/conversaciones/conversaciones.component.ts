// src/app/components/mensajes/conversaciones/conversaciones.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MensajesService } from '../../../../../core/services/mensajes.service';
import { Conversacion } from '../../../../../core/models/mensaje.models';

@Component({
  selector: 'app-conversaciones',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './conversaciones.component.html',
  styleUrls: ['./conversaciones.component.css']
})
export class ConversacionesComponent implements OnInit, OnDestroy {
  private mensajesService = inject(MensajesService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // Datos
  conversaciones: Conversacion[] = [];
  conversacionesFiltradas: Conversacion[] = [];
  
  // UI
  cargando = true;
  error: string | null = null;
  busqueda = '';
  mensajesNoLeidos = 0;

  // Avatar por defecto
  defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%236366f1" width="100" height="100"/%3E%3Ctext x="50" y="50" font-size="40" fill="white" text-anchor="middle" dy=".3em"%3E?%3C/text%3E%3C/svg%3E';

  ngOnInit(): void {
    console.log('💬 [INIT] ConversacionesComponent inicializado');
    this.cargarConversaciones();
    this.suscribirseAMensajesNoLeidos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * 📥 Carga todas las conversaciones del usuario
   */
  cargarConversaciones(): void {
    console.log('💬 [CARGA] Obteniendo conversaciones...');
    this.cargando = true;
    this.error = null;

    this.mensajesService.obtenerConversaciones()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (conversaciones) => {
          console.log('✅ Conversaciones cargadas:', conversaciones.length);
          this.conversaciones = conversaciones;
          this.conversacionesFiltradas = conversaciones;
          this.cargando = false;
        },
        error: (error) => {
          console.error('❌ Error al cargar conversaciones:', error);
          this.error = 'No se pudieron cargar las conversaciones';
          this.cargando = false;
        }
      });
  }

  /**
   * 🔔 Se suscribe al observable de mensajes no leídos
   */
  private suscribirseAMensajesNoLeidos(): void {
    this.mensajesService.mensajesNoLeidos$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cantidad) => {
          this.mensajesNoLeidos = cantidad;
        }
      });
  }

  /**
   * 🔍 Filtra conversaciones por búsqueda
   */
  filtrarConversaciones(): void {
    const busquedaLower = this.busqueda.toLowerCase().trim();
    
    if (!busquedaLower) {
      this.conversacionesFiltradas = this.conversaciones;
      return;
    }

    this.conversacionesFiltradas = this.conversaciones.filter(conv => {
      const nombre = this.mensajesService.obtenerNombreCompleto(conv.otro_usuario).toLowerCase();
      const email = (conv.otro_usuario.email || '').toLowerCase();
      const contenido = (conv.ultimo_mensaje.contenido || '').toLowerCase();
      
      return nombre.includes(busquedaLower) || 
             email.includes(busquedaLower) || 
             contenido.includes(busquedaLower);
    });
  }

  /**
   * 🧹 Limpia la búsqueda
   */
  limpiarBusqueda(): void {
    this.busqueda = '';
    this.filtrarConversaciones();
  }

  /**
   * 💬 Abre una conversación específica
   */
  abrirConversacion(conversacion: Conversacion): void {
    console.log('💬 Abriendo conversación con:', conversacion.otro_usuario.nombre);
    this.router.navigate(['/mensajes/chat', conversacion.otro_usuario.id_usuario]);
  }

  /**
   * ➕ Navega a iniciar una nueva conversación
   */
  nuevaConversacion(): void {
    this.router.navigate(['/mensajes/nueva']);
  }

  /**
   * 🔄 Recarga las conversaciones
   */
  recargar(): void {
    this.cargarConversaciones();
    this.mensajesService.actualizarContadorMensajes();
  }

  /**
   * 🎨 Obtiene las iniciales de un usuario
   */
  obtenerIniciales(usuario: any): string {
    return this.mensajesService.obtenerIniciales(usuario);
  }

  /**
   * 📝 Obtiene el nombre completo de un usuario
   */
  obtenerNombreCompleto(usuario: any): string {
    return this.mensajesService.obtenerNombreCompleto(usuario);
  }

  /**
   * 📅 Formatea la fecha del último mensaje
   */
  formatearFecha(fecha: string): string {
    return this.mensajesService.formatearFechaMensaje(fecha);
  }

  /**
   * 📋 Trunca el contenido del último mensaje
   */
  truncarContenido(contenido: string, maxLength: number = 50): string {
    if (!contenido) return '';
    return contenido.length > maxLength 
      ? contenido.substring(0, maxLength) + '...' 
      : contenido;
  }

  /**
   * 🖼️ Maneja error al cargar imagen
   */
  onImageError(event: any): void {
    event.target.src = this.defaultAvatar;
  }
}