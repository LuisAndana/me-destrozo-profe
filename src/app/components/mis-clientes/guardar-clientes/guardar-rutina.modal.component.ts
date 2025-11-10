import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RutinaGenerada } from '../../../core/services/rutina.service';

@Component({
  selector: 'app-guardar-rutina-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="mostrar" (click)="cerrar()">
      <div class="modal-contenido" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <h2>💾 Guardar Rutina</h2>
          <button class="close-btn" (click)="cerrar()">✕</button>
        </div>

        <!-- Contenido -->
        <div class="modal-body">
          <div class="form-group">
            <label for="nombre">Nombre de la Rutina *</label>
            <input
              id="nombre"
              [(ngModel)]="datos.nombre"
              type="text"
              placeholder="Ej: Rutina de Volumen - Semana 1"
              class="input"
            />
          </div>

          <div class="form-group">
            <label for="descripcion">Descripción (Opcional)</label>
            <textarea
              id="descripcion"
              [(ngModel)]="datos.descripcion"
              placeholder="Agrega notas o detalles adicionales..."
              class="textarea"
            ></textarea>
          </div>

          <div class="info-box">
            <strong>📊 Resumen:</strong>
            <p>Total Ejercicios: <strong>{{ rutina?.total_ejercicios }}</strong></p>
            <p>Tiempo Estimado: <strong>{{ rutina?.minutos_aproximados }} min</strong></p>
            <p>Días/Semana: <strong>{{ rutina?.dias_semana }}</strong></p>
            <p>Nivel: <strong>{{ rutina?.nivel }}</strong></p>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button (click)="cerrar()" class="btn btn-secondary">
            Cancelar
          </button>
          <button
            (click)="guardar()"
            [disabled]="!datos.nombre || cargando"
            class="btn btn-success"
          >
            <span *ngIf="!cargando">💾 Guardar</span>
            <span *ngIf="cargando">Guardando...</span>
          </button>
        </div>

        <!-- Mensajes -->
        <div *ngIf="error" class="alert alert-error">
          ⚠️ {{ error }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .modal-contenido {
      background: linear-gradient(135deg, #1a1f2e 0%, #2a2f3e 100%);
      border: 1px solid #3a4050;
      border-radius: 0.75rem;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        transform: translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .modal-header {
      padding: 1.5rem;
      border-bottom: 2px solid #3a4050;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h2 {
      color: #00d4ff;
      font-size: 1.3rem;
      margin: 0;
    }

    .close-btn {
      background: none;
      border: none;
      color: #a0a0a0;
      font-size: 1.5rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .close-btn:hover {
      color: #00d4ff;
    }

    .modal-body {
      padding: 2rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #e0e0e0;
    }

    .input,
    .textarea {
      width: 100%;
      padding: 0.75rem;
      background: #0f1419;
      border: 1px solid #3a4050;
      border-radius: 0.5rem;
      color: #e0e0e0;
      font-family: inherit;
      font-size: 0.95rem;
      transition: all 0.3s ease;
    }

    .input:focus,
    .textarea:focus {
      outline: none;
      border-color: #00d4ff;
      box-shadow: 0 0 10px rgba(0, 212, 255, 0.2);
      background: #1a1f2e;
    }

    .textarea {
      min-height: 100px;
      resize: vertical;
    }

    .info-box {
      background: rgba(0, 212, 255, 0.1);
      border-left: 3px solid #00d4ff;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-top: 1.5rem;
    }

    .info-box strong {
      color: #00d4ff;
    }

    .info-box p {
      margin: 0.5rem 0;
      color: #b0b0b0;
      font-size: 0.9rem;
    }

    .modal-footer {
      padding: 1.5rem;
      border-top: 1px solid #3a4050;
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      white-space: nowrap;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #3a4050;
      color: #e0e0e0;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #4a5060;
      transform: translateY(-2px);
    }

    .btn-success {
      background: linear-gradient(135deg, #51cf66 0%, #2f9e44 100%);
      color: #000;
      flex: 1;
    }

    .btn-success:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(81, 207, 102, 0.3);
    }

    .alert {
      padding: 1rem;
      background-color: #c41e3a;
      color: #fff;
      border-left: 4px solid #ff6b6b;
      border-radius: 0.5rem;
      margin-top: 1rem;
    }
  `]
})
export class GuardarRutinaModalComponent {
  @Input() mostrar: boolean = false;
  @Input() rutina: RutinaGenerada | null = null;
  @Output() guardarEvent = new EventEmitter<{ nombre: string; descripcion: string }>();
  @Output() cerrarEvent = new EventEmitter<void>();

  datos = {
    nombre: '',
    descripcion: ''
  };

  cargando: boolean = false;
  error: string = '';

  ngOnChanges() {
    if (this.mostrar && this.rutina) {
      this.datos.nombre = this.rutina.nombre;
      this.datos.descripcion = this.rutina.descripcion;
      this.error = '';
    }
  }

  guardar(): void {
    if (!this.datos.nombre.trim()) {
      this.error = 'El nombre es obligatorio';
      return;
    }

    this.cargando = true;
    this.guardarEvent.emit(this.datos);
  }

  cerrar(): void {
    this.datos = { nombre: '', descripcion: '' };
    this.error = '';
    this.cerrarEvent.emit();
  }
}