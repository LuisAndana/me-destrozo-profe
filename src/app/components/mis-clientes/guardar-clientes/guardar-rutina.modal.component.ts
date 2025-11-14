import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
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
            <label for="nombre">Nombre de la Rutina * (máximo 95 caracteres)</label>
            <input
              id="nombre"
              [(ngModel)]="datos.nombre"
              type="text"
              placeholder="Ej: Hipertrofia - 4 días - Intermedio"
              class="input"
              maxlength="95"
              (keyup.enter)="guardar()"
            />
            <small *ngIf="datos.nombre.length > 80" 
                   [class.text-warning]="datos.nombre.length > 80 && datos.nombre.length <= 95"
                   [class.text-danger]="datos.nombre.length > 95">
              {{ datos.nombre.length }}/95 caracteres
            </small>
          </div>

          <div class="form-group">
            <label for="descripcion">Descripción (Opcional)</label>
            <textarea
              id="descripcion"
              [(ngModel)]="datos.descripcion"
              placeholder="Agrega notas o detalles adicionales..."
              class="textarea"
              rows="3"
            ></textarea>
          </div>

          <div class="info-box" *ngIf="rutina">
            <strong>📊 Resumen:</strong>
            <p>Total Ejercicios: <strong>{{ rutina.total_ejercicios }}</strong></p>
            <p>Tiempo Estimado: <strong>{{ rutina.minutos_aproximados }} min</strong></p>
            <p>Días/Semana: <strong>{{ rutina.dias_semana }}</strong></p>
            <p>Nivel: <strong>{{ rutina.nivel }}</strong></p>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button (click)="cerrar()" class="btn btn-secondary" [disabled]="cargando">
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
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-contenido {
      background: linear-gradient(135deg, #1a1f2e 0%, #2a2f3e 100%);
      border: 1px solid #3a4050;
      border-radius: 0.75rem;
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
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
      position: sticky;
      top: 0;
      background: linear-gradient(135deg, #1a1f2e 0%, #2a2f3e 100%);
      z-index: 1;
    }

    .modal-header h2 {
      margin: 0;
      color: #00d4ff;
      font-size: 1.4rem;
    }

    .close-btn {
      background: none;
      border: none;
      color: #a0a0a0;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }

    .close-btn:hover {
      color: #ff6b6b;
      transform: rotate(90deg);
    }

    .modal-body {
      padding: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      color: #00d4ff;
      font-weight: 600;
      margin-bottom: 0.5rem;
      font-size: 0.95rem;
    }

    .input,
    .textarea {
      width: 100%;
      padding: 0.75rem;
      background: #2a2f3e;
      border: 2px solid #3a4050;
      border-radius: 0.5rem;
      color: #fff;
      font-size: 0.95rem;
      transition: all 0.3s ease;
    }

    .input:focus,
    .textarea:focus {
      outline: none;
      border-color: #00d4ff;
      box-shadow: 0 0 10px rgba(0, 212, 255, 0.2);
    }

    .textarea {
      resize: vertical;
      min-height: 80px;
      font-family: inherit;
    }

    .form-group small {
      display: block;
      margin-top: 0.25rem;
      font-size: 0.8rem;
      color: #a0a0a0;
    }

    .text-warning {
      color: #ffa500 !important;
    }

    .text-danger {
      color: #ff6b6b !important;
      font-weight: 600;
    }

    .info-box {
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid #00d4ff;
      border-left: 4px solid #00d4ff;
      border-radius: 0.5rem;
      padding: 1rem;
      margin-top: 1rem;
    }

    .info-box strong {
      color: #00d4ff;
      display: block;
      margin-bottom: 0.5rem;
    }

    .info-box p {
      color: #a0a0a0;
      font-size: 0.9rem;
      margin: 0.25rem 0;
    }

    .info-box p strong {
      color: #fff;
      display: inline;
    }

    .modal-footer {
      padding: 1.5rem;
      border-top: 2px solid #3a4050;
      display: flex;
      gap: 1rem;
      position: sticky;
      bottom: 0;
      background: linear-gradient(135deg, #1a1f2e 0%, #2a2f3e 100%);
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.95rem;
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
      background-color: rgba(196, 30, 58, 0.2);
      color: #ff6b6b;
      border: 1px solid #ff6b6b;
      border-left: 4px solid #ff6b6b;
      border-radius: 0.5rem;
      margin-top: 1rem;
      font-size: 0.9rem;
    }

    ::-webkit-scrollbar {
      width: 6px;
    }

    ::-webkit-scrollbar-track {
      background: transparent;
    }

    ::-webkit-scrollbar-thumb {
      background: #3a4050;
      border-radius: 3px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: #00d4ff;
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

  ngOnChanges(changes: SimpleChanges) {
    if (changes['mostrar'] && changes['mostrar'].currentValue && this.rutina) {
      // Generar nombre corto automáticamente
      this.datos.nombre = this.generarNombreCorto(this.rutina.nombre);
      this.datos.descripcion = this.rutina.descripcion;
      this.error = '';
      this.cargando = false;
    }
  }

  /**
   * Generar nombre corto para la rutina (máximo 95 caracteres)
   */
  private generarNombreCorto(nombreOriginal: string): string {
    if (nombreOriginal.length <= 95) {
      return nombreOriginal;
    }

    // Extraer información clave del nombre original
    const partes = nombreOriginal.split('-').map(p => p.trim());
    
    // Si tiene el formato típico de "Rutina de NIVEL - Detalles", simplificarlo
    if (partes.length > 0) {
      const nivel = partes[0].replace('Rutina de', '').trim();
      return `Rutina ${nivel}`.substring(0, 95);
    }

    // Fallback: truncar
    return nombreOriginal.substring(0, 92) + '...';
  }

  guardar(): void {
    if (!this.datos.nombre.trim()) {
      this.error = 'El nombre es obligatorio';
      return;
    }

    this.cargando = true;
    this.error = '';
    this.guardarEvent.emit(this.datos);
    
    // Resetear estado después de un tiempo (por si acaso)
    setTimeout(() => {
      this.cargando = false;
    }, 5000);
  }

  cerrar(): void {
    this.datos = { nombre: '', descripcion: '' };
    this.error = '';
    this.cargando = false;
    this.cerrarEvent.emit();
  }
}