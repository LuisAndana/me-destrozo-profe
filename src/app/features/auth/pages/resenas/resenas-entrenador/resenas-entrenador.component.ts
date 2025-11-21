import { Component, OnInit, OnDestroy, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CrearEditarResenaComponent } from '../crear-editar-resena/crear-editar-resena.component';
import { ListarResenasComponent } from '../listar-resenas/listar-resenas.component';
import { ResenaService } from '../../../../../core/services/resena.service';
import { ResenaOut } from '../../../../../core/models/resena.models';

@Component({
  selector: 'app-resenas-entrenador',
  standalone: true,
  imports: [CommonModule, CrearEditarResenaComponent, ListarResenasComponent],
  templateUrl: './resenas-entrenador.component.html',
  styleUrl: './resenas-entrenador.component.css'
})
export class ResenasEntrenadorComponent implements OnInit, OnDestroy {
  @Input() idEntrenador!: number;
  @Input() nombreEntrenador: string = 'Entrenador';

  private resenaService = inject(ResenaService);
  private destroy$ = new Subject<void>();

  idUsuarioActual!: number;
  rolUsuarioActual: string = '';
  mostrarFormulario = false;
  miResena: ResenaOut | null = null;
  cargandoMiResena = false;

  esCliente = false;
  esEntrenador = false;

  ngOnInit(): void {
  this.obtenerIdUsuario();
  this.determinarRol();

  // ⭐ IMPORTANTE: Si no se recibe por @Input(), se asigna automáticamente
  if (!this.idEntrenador) {
    this.idEntrenador = this.idUsuarioActual;
  }

  if (this.esCliente) {
    this.cargarMiResena();
  }
}


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private obtenerIdUsuario(): void {
    try {
      const usuarioJson = localStorage.getItem('usuario');
      if (usuarioJson) {
        const usuario = JSON.parse(usuarioJson);
        this.idUsuarioActual = usuario.id || usuario.id_usuario;
        this.rolUsuarioActual = usuario.rol || usuario.userType || '';
      }
    } catch (e) {
      console.error('Error obteniendo usuario:', e);
    }
  }

  private determinarRol(): void {
  const rol = (this.rolUsuarioActual || '').toLowerCase();
  console.log('Rol detectado:', rol); // Para debugging
  
  this.esCliente = rol.includes('cliente') || 
                   rol.includes('client') ||
                   rol.includes('alumno') ||
                   rol.includes('student');
                   
  this.esEntrenador = rol.includes('entrenador') || 
                      rol.includes('trainer') ||
                      rol.includes('coach');
}

  private cargarMiResena(): void {
    if (!this.idUsuarioActual || !this.esCliente) return;
    this.cargandoMiResena = true;
    this.resenaService.obtenerMiResena(this.idEntrenador, this.idUsuarioActual)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resena) => {
          this.miResena = resena;
          this.cargandoMiResena = false;
          if (resena) {
            this.mostrarFormulario = false;
          }
        },
        error: (err) => {
          console.error('Error cargando mi reseña:', err);
          this.cargandoMiResena = false;
        }
      });
  }

  toggleFormulario(): void {
    if (!this.esCliente) return;
    if (!this.miResena) {
      this.mostrarFormulario = !this.mostrarFormulario;
    } else {
      this.mostrarFormulario = !this.mostrarFormulario;
    }
  }

  onResenaGuardada(resena: ResenaOut): void {
    this.miResena = resena;
    this.mostrarFormulario = false;
    this.cargarMiResena();
  }

  onCancelado(): void {
    this.mostrarFormulario = false;
  }

  get puedeCalificar(): boolean {
    return this.esCliente && !this.cargandoMiResena;
  }

  get textoBotonAccion(): string {
    if (!this.miResena) {
      return this.mostrarFormulario ? 'Cancelar' : '⭐ Califica a este entrenador';
    }
    return this.mostrarFormulario ? 'Cancelar' : '✏️ Editar mi reseña';
  }

  get mostrarSeccionCrear(): boolean {
    return this.esCliente;
  }

  get mostrarSeccionResenas(): boolean {
    return this.esCliente || this.esEntrenador;
  }

  get tituloSeccion(): string {
    if (this.esEntrenador) {
      return 'Mis Reseñas';
    }
    return 'Reseñas y Calificaciones';
  }
}