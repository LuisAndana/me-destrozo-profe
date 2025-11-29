// src/app/components/mensajes/chat/chat.component.ts
// VERSIÓN CORREGIDA - Evita re-renderizado de mensajes

import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { MensajesService } from '../../../../../core/services/mensajes.service';
import { ClienteEntrenadorService } from '../../../../../core/services/cliente-entrenador.service';
import { Mensaje, MensajeCreate } from '../../../../../core/models/mensaje.models';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  private mensajesService = inject(MensajesService);
  private clienteEntrenadorService = inject(ClienteEntrenadorService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  // IDs
  idOtroUsuario!: number;
  idUsuarioActual!: number;
  rolUsuario: string = '';

  // Datos
  mensajes: Mensaje[] = [];
  otroUsuario: any = null;

  // UI
  nuevoMensaje = '';
  cargando = true;
  error: string | null = null;
  enviando = false;
  shouldScrollToBottom = false;
  cargandoUsuario = true;

  // Polling para actualizar mensajes
  private pollingInterval = 5000; // 5 segundos

  // Avatar por defecto
  defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%236366f1" width="100" height="100"/%3E%3Ctext x="50" y="50" font-size="40" fill="white" text-anchor="middle" dy=".3em"%3E?%3C/text%3E%3C/svg%3E';

  ngOnInit(): void {
  console.log('💬 [INIT] ChatComponent inicializado');

  this.rolUsuario = this.obtenerRolUsuario();

  this.idUsuarioActual = this.obtenerIdUsuarioActual();
  if (!this.idUsuarioActual) {
    this.error = 'No se pudo identificar al usuario actual';
    this.cargando = false;
    this.cargandoUsuario = false;
    return;
  }

    // Obtener ID del otro usuario desde la ruta
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.idOtroUsuario = +params['id'];
      console.log('💬 ID otro usuario:', this.idOtroUsuario);
      
      if (this.idOtroUsuario === this.idUsuarioActual) {
        this.error = 'No puedes chatear contigo mismo';
        this.cargando = false;
        this.cargandoUsuario = false;
        return;
      }

      this.cargarDatosIniciales();
      this.iniciarPolling();
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * 🆔 Obtiene el ID del usuario actual desde localStorage
   */
  private obtenerIdUsuarioActual(): number {
    try {
      const usuarioStr = localStorage.getItem('usuario');
      if (!usuarioStr) return 0;
      
      const usuario = JSON.parse(usuarioStr);
      return usuario.id || usuario.id_usuario || 0;
    } catch (error) {
      console.error('❌ Error al obtener ID de usuario actual:', error);
      return 0;
    }
  }

  /**
   * 📥 Carga datos iniciales (usuario y mensajes)
   */
  private cargarDatosIniciales(): void {
    this.cargando = true;
    this.error = null;

    // Cargar información del otro usuario
    this.cargarInfoOtroUsuario();

    // Cargar mensajes de la conversación
    this.cargarMensajes();
  }

  /**
   * 👤 Carga información del otro usuario
   */
  private cargarInfoOtroUsuario(): void {
  this.cargandoUsuario = true;
  const rolUsuario = this.obtenerRolUsuario();

  console.log('👤 [CARGA USUARIO] Buscando información del usuario:', this.idOtroUsuario);
  console.log('🔑 Rol del usuario actual:', rolUsuario);

  if (rolUsuario === 'entrenador' || rolUsuario === 'trainer') {
    console.log('🔍 CASO 1: Eres ENTRENADOR, buscando CLIENTES...');

    this.clienteEntrenadorService.misClientes(this.idUsuarioActual)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clientes) => {
          console.log('📋 Clientes obtenidos:', clientes.length);

          const clienteEncontrado = clientes.find(relacion =>
            relacion.cliente &&
            relacion.cliente.id_usuario === this.idOtroUsuario
          );

          if (clienteEncontrado?.cliente) {
            this.otroUsuario = clienteEncontrado.cliente;
            console.log('✅ CLIENTE ENCONTRADO:', this.otroUsuario);
            this.cargandoUsuario = false;
            return;
          }

          console.log('⚠️ Cliente no encontrado en tu lista');
          this.usarFallback();
        },
        error: (error) => {
          console.error('❌ Error buscando clientes:', error);
          this.usarFallback();
        }
      });

    return;
  }

  console.log('🔍 CASO 2: Eres CLIENTE, buscando tu ENTRENADOR...');

  this.clienteEntrenadorService.miEntrenador(this.idUsuarioActual)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (respuesta) => {
        console.log('📋 Respuesta de miEntrenador():', respuesta);

        if (respuesta?.entrenador) {
          this.otroUsuario = respuesta.entrenador;
          this.cargandoUsuario = false;
          return;
        }

        console.log('⚠️ Entrenador no encontrado');
        this.usarFallback();
      },
      error: (error) => {
        console.error('❌ Error buscando entrenador:', error);
        this.usarFallback();
      }
    });
}

  /**
   * 📋 Fallback: Usar información mínima cuando no se puede cargar
   */
  private usarFallback(): void {
    console.log('⚠️ [FALLBACK] Usuario ID', this.idOtroUsuario, 'no encontrado, usando placeholder');
    this.otroUsuario = {
      id_usuario: this.idOtroUsuario,
      nombre: `Usuario ${this.idOtroUsuario}`,
      apellido: '',
      email: '',
      foto_url: null,
      rol: 'usuario'
    };
    this.cargandoUsuario = false;
  }

  /**
   * 🔑 Obtiene el rol del usuario actual
   */
  obtenerRolUsuario(): string {
    try {
      const usuarioStr = localStorage.getItem('usuario');
      if (!usuarioStr) return '';
      
      const usuario = JSON.parse(usuarioStr);
      return usuario.rol || '';
    } catch (error) {
      return '';
    }
  }

  /**
   * 💬 Carga los mensajes de la conversación
   */
  private cargarMensajes(): void {
    console.log('💬 [CARGA] Obteniendo mensajes...');

    this.mensajesService.obtenerConversacion(this.idOtroUsuario)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (historial) => {
          console.log('✅ Mensajes cargados:', historial.total);
          this.mensajes = historial.mensajes;
          this.cargando = false;
          this.shouldScrollToBottom = true;
          
          // Marcar conversación como leída
          this.marcarConversacionComoLeida();
        },
        error: (error) => {
          console.error('❌ Error al cargar mensajes:', error);
          this.error = 'No se pudieron cargar los mensajes';
          this.cargando = false;
        }
      });
  }

  /**
   * 🔄 Inicia el polling para actualizar mensajes automáticamente
   * ⭐ VERSIÓN CORREGIDA: Solo agrega mensajes nuevos, no reemplaza todos
   */
  private iniciarPolling(): void {
    interval(this.pollingInterval)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.mensajesService.obtenerConversacion(this.idOtroUsuario))
      )
      .subscribe({
        next: (historial) => {
          const cantidadAnterior = this.mensajes.length;
          
          // ⭐ SOLO agregar mensajes nuevos, NO reemplazar todo
          if (historial.mensajes.length > cantidadAnterior) {
            // Obtener solo los mensajes nuevos
            const mensajesNuevos = historial.mensajes.slice(cantidadAnterior);
            
            // Agregar solo los nuevos (no reemplazar todo)
            this.mensajes.push(...mensajesNuevos);
            
            console.log('✅ Mensajes nuevos agregados:', mensajesNuevos.length);
            this.shouldScrollToBottom = true;
            this.marcarConversacionComoLeida();
          }
        },
        error: (error) => {
          console.error('❌ Error en polling de mensajes:', error);
        }
      });
  }

  /**
   * ✅ Marca la conversación como leída
   */
  private marcarConversacionComoLeida(): void {
    this.mensajesService.marcarConversacionLeida(this.idOtroUsuario)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('❌ Error al marcar conversación como leída:', error);
        }
      });
  }

  /**
   * 📤 Envía un nuevo mensaje
   */
  enviarMensaje(): void {
    const contenido = this.nuevoMensaje.trim();
    
    if (!contenido || this.enviando) return;

    console.log('📤 Enviando mensaje...');
    this.enviando = true;

    const mensajeData: MensajeCreate = {
      id_destinatario: this.idOtroUsuario,
      contenido: contenido
    };

    this.mensajesService.enviarMensaje(mensajeData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (mensaje) => {
          console.log('✅ Mensaje enviado:', mensaje);
          this.mensajes.push(mensaje);
          this.nuevoMensaje = '';
          this.enviando = false;
          this.shouldScrollToBottom = true;
          
          // Actualizar contador de mensajes
          this.mensajesService.actualizarContadorMensajes();
        },
        error: (error) => {
          console.error('❌ Error al enviar mensaje:', error);
          this.enviando = false;
          alert('Error al enviar el mensaje. Por favor, intenta de nuevo.');
        }
      });
  }

  /**
   * ⬇️ Hace scroll al final del chat
   */
  private scrollToBottom(): void {
    try {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = 
          this.chatContainer.nativeElement.scrollHeight;
      }
    } catch (error) {
      console.error('Error al hacer scroll:', error);
    }
  }

  /**
   * ⬅️ Vuelve a la lista de conversaciones
   */
  volver(): void {
    this.router.navigate(['/mensajes']);
  }

  /**
   * 🔄 Recarga los mensajes
   */
  recargar(): void {
    this.cargarMensajes();
  }

  /**
   * 📅 Formatea la hora de un mensaje
   */
  formatearHora(fecha: string): string {
    const fechaMensaje = new Date(fecha);
    return fechaMensaje.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * 📅 Formatea la fecha completa
   */
  formatearFechaCompleta(fecha: string): string {
    return this.mensajesService.formatearFechaCompleta(fecha);
  }

  /**
   * ✅ Verifica si un mensaje fue enviado por el usuario actual
   */
  esMensajeMio(mensaje: Mensaje): boolean {
    return mensaje.id_remitente === this.idUsuarioActual;
  }

  /**
   * 🎨 Obtiene las iniciales del otro usuario
   */
  obtenerIniciales(): string {
    if (!this.otroUsuario) return '?';
    return this.mensajesService.obtenerIniciales(this.otroUsuario);
  }

  /**
   * 📝 Obtiene el nombre completo del otro usuario
   */
  obtenerNombreCompleto(): string {
    if (!this.otroUsuario) return 'Cargando...';
    
    const nombre = this.otroUsuario.nombre || '';
    const apellido = this.otroUsuario.apellido || '';
    const nombreCompleto = `${nombre} ${apellido}`.trim();
    
    return nombreCompleto || 'Usuario';
  }

  /**
   * 🖼️ Maneja error al cargar imagen
   */
  onImageError(event: any): void {
    event.target.src = this.defaultAvatar;
  }

  /**
   * ⌨️ Maneja el evento de presionar Enter en el textarea
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviarMensaje();
    }
  }

  /**
   * 📊 Agrupa mensajes por fecha
   */
  agruparMensajesPorFecha(): { fecha: string, mensajes: Mensaje[] }[] {
    const grupos: { [key: string]: Mensaje[] } = {};

    this.mensajes.forEach(mensaje => {
      const fecha = new Date(mensaje.fecha_envio).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      if (!grupos[fecha]) {
        grupos[fecha] = [];
      }
      grupos[fecha].push(mensaje);
    });

    return Object.keys(grupos).map(fecha => ({
      fecha,
      mensajes: grupos[fecha]
    }));
  }

  /**
   * 🔍 TrackBy para optimizar ngFor con mensajes
   * Previene que Angular re-renderice todos los mensajes cuando hay cambios
   */
  trackByMensaje(index: number, mensaje: Mensaje): number {
    return mensaje.id_mensaje || index;
  }

  /**
   * 🔍 TrackBy para optimizar ngFor con grupos de fecha
   */
  trackByGrupo(index: number, grupo: { fecha: string, mensajes: Mensaje[] }): string {
    return grupo.fecha;
  }
}