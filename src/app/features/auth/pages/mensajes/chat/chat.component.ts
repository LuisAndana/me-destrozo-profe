// src/app/components/mensajes/chat/chat.component.ts
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

  // Datos
  mensajes: Mensaje[] = [];
  otroUsuario: any = null;

  // UI
  nuevoMensaje = '';
  cargando = true;
  error: string | null = null;
  enviando = false;
  shouldScrollToBottom = false;

  // Polling para actualizar mensajes
  private pollingInterval = 5000; // 5 segundos

  // Avatar por defecto
  defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%236366f1" width="100" height="100"/%3E%3Ctext x="50" y="50" font-size="40" fill="white" text-anchor="middle" dy=".3em"%3E?%3C/text%3E%3C/svg%3E';

  ngOnInit(): void {
    console.log('💬 [INIT] ChatComponent inicializado');
    
    // Obtener ID del usuario actual
    this.idUsuarioActual = this.obtenerIdUsuarioActual();
    if (!this.idUsuarioActual) {
      this.error = 'No se pudo identificar al usuario actual';
      this.cargando = false;
      return;
    }

    // Obtener ID del otro usuario desde la ruta
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.idOtroUsuario = +params['id'];
      console.log('💬 ID otro usuario:', this.idOtroUsuario);
      
      if (this.idOtroUsuario === this.idUsuarioActual) {
        this.error = 'No puedes chatear contigo mismo';
        this.cargando = false;
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
    // Intentar obtener del servicio de cliente-entrenador
    // Esto asume que el otro usuario está en la relación cliente-entrenador
    
    const rolUsuario = this.obtenerRolUsuario();
    
    if (rolUsuario === 'entrenador') {
      // El usuario actual es entrenador, buscar en sus clientes
      this.clienteEntrenadorService.misClientes(this.idUsuarioActual)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (clientes) => {
            const cliente = clientes.find(c => c.cliente.id_usuario === this.idOtroUsuario);
            if (cliente) {
              this.otroUsuario = cliente.cliente;
              console.log('✅ Cliente encontrado:', this.otroUsuario);
            } else {
              this.cargarUsuarioGenerico();
            }
          },
          error: () => {
            this.cargarUsuarioGenerico();
          }
        });
    } else {
      // El usuario actual es cliente, buscar su entrenador
      this.clienteEntrenadorService.miEntrenador(this.idUsuarioActual)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (entrenador) => {
            if (entrenador && entrenador.entrenador.id_usuario === this.idOtroUsuario) {
              this.otroUsuario = entrenador.entrenador;
              console.log('✅ Entrenador encontrado:', this.otroUsuario);
            } else {
              this.cargarUsuarioGenerico();
            }
          },
          error: () => {
            this.cargarUsuarioGenerico();
          }
        });
    }
  }

  /**
   * 👤 Carga información genérica del usuario (fallback)
   */
  private cargarUsuarioGenerico(): void {
    this.otroUsuario = {
      id_usuario: this.idOtroUsuario,
      nombre: 'Usuario',
      apellido: '',
      email: '',
      foto_url: null
    };
    console.log('⚠️ Usando información genérica para usuario:', this.idOtroUsuario);
  }

  /**
   * 🔑 Obtiene el rol del usuario actual
   */
  private obtenerRolUsuario(): string {
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
          this.mensajes = historial.mensajes;
          
          // Si hay nuevos mensajes, hacer scroll al final
          if (this.mensajes.length > cantidadAnterior) {
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
    return this.mensajesService.obtenerIniciales(this.otroUsuario);
  }

  /**
   * 📝 Obtiene el nombre completo del otro usuario
   */
  obtenerNombreCompleto(): string {
    return this.mensajesService.obtenerNombreCompleto(this.otroUsuario);
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
}