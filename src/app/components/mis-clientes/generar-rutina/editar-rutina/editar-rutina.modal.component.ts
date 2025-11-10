import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Ejercicio, DiaRutina, RutinaGenerada } from '../../../../core/services/rutina.service';

@Component({
  selector: 'app-editar-rutina-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="mostrar" (click)="cerrar()">
      <div class="modal-contenido" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <h2>✏️ Editar Rutina</h2>
          <button class="close-btn" (click)="cerrar()">✕</button>
        </div>

        <!-- Tabs -->
        <div class="tabs-container" *ngIf="rutina">
          <button
            [class.tab-activo]="tabActivo === 'info'"
            (click)="tabActivo = 'info'"
            class="tab"
          >
            📋 Información
          </button>
          <button
            [class.tab-activo]="tabActivo === 'dias'"
            (click)="tabActivo = 'dias'"
            class="tab"
          >
            📅 Días
          </button>
          <button
            [class.tab-activo]="tabActivo === 'ejercicios'"
            (click)="tabActivo = 'ejercicios'"
            class="tab"
          >
            💪 Ejercicios
          </button>
        </div>

        <!-- Contenido -->
        <div class="modal-body">
          <!-- Validación de rutina -->
          <div *ngIf="!rutina" class="alert alert-error">
            ⚠️ No hay rutina para editar
          </div>

          <!-- Tab: Información -->
          <div *ngIf="tabActivo === 'info' && rutina" class="tab-content">
            <div class="form-group">
              <label for="nombre">Nombre *</label>
              <input
                id="nombre"
                [(ngModel)]="rutina.nombre"
                type="text"
                class="input"
              />
            </div>

            <div class="form-group">
              <label for="descripcion">Descripción</label>
              <textarea
                id="descripcion"
                [(ngModel)]="rutina.descripcion"
                class="textarea"
              ></textarea>
            </div>

            <div class="form-group">
              <label for="objetivo">Objetivo</label>
              <input
                id="objetivo"
                [(ngModel)]="rutina.objetivo"
                type="text"
                class="input"
              />
            </div>

            <div class="info-grid">
              <div class="info-item">
                <strong>Nivel:</strong> {{ rutina.nivel }}
              </div>
              <div class="info-item">
                <strong>Días/Semana:</strong> {{ rutina.dias_semana }}
              </div>
              <div class="info-item">
                <strong>Total Ejercicios:</strong> {{ rutina.total_ejercicios }}
              </div>
              <div class="info-item">
                <strong>Tiempo:</strong> {{ rutina.minutos_aproximados }} min
              </div>
            </div>
          </div>

          <!-- Tab: Días -->
          <div *ngIf="tabActivo === 'dias' && rutina" class="tab-content">
            <div *ngFor="let dia of rutina.dias; let i = index" class="dia-item">
              <h4>
                📅 Día {{ dia.numero_dia }}: {{ dia.nombre_dia }}
              </h4>

              <div class="form-group">
                <label>Nombre del Día</label>
                <input
                  [(ngModel)]="dia.nombre_dia"
                  type="text"
                  class="input"
                />
              </div>

              <div class="form-group">
                <label>Descripción</label>
                <textarea
                  [(ngModel)]="dia.descripcion"
                  class="textarea"
                ></textarea>
              </div>

              <div class="form-group">
                <label>Enfoque Muscular</label>
                <input
                  type="text"
                  [(ngModel)]="diaEnfoqueTexto[i]"
                  (ngModelChange)="actualizarEnfoque(i)"
                  placeholder="Ej: PECHO, TRÍCEPS"
                  class="input"
                />
                <small>Separa con comas</small>
              </div>
            </div>
          </div>

          <!-- Tab: Ejercicios -->
          <div *ngIf="tabActivo === 'ejercicios' && rutina" class="tab-content">
            <div *ngFor="let dia of rutina.dias; let diaIdx = index" class="dia-ejercicios">
              <h4>{{ dia.nombre_dia }}</h4>

              <div
                *ngFor="let ejercicio of dia.ejercicios; let ejIdx = index"
                class="ejercicio-item"
              >
                <div class="ejercicio-header">
                  <span>{{ ejercicio.nombre }}</span>
                  <button
                    (click)="eliminarEjercicio(diaIdx, ejIdx)"
                    class="btn-delete"
                  >
                    ✕
                  </button>
                </div>

                <div class="form-group">
                  <label>Series</label>
                  <input
                    [(ngModel)]="ejercicio.series"
                    type="number"
                    min="1"
                    class="input-small"
                  />
                </div>

                <div class="form-group">
                  <label>Repeticiones</label>
                  <input
                    [(ngModel)]="ejercicio.repeticiones"
                    type="number"
                    min="1"
                    class="input-small"
                  />
                </div>

                <div class="form-group">
                  <label>Descanso (segundos)</label>
                  <input
                    [(ngModel)]="ejercicio.descanso_segundos"
                    type="number"
                    min="0"
                    class="input-small"
                  />
                </div>

                <div class="form-group">
                  <label>Notas</label>
                  <textarea
                    [(ngModel)]="ejercicio.notas"
                    class="textarea-small"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- Mensajes -->
          <div *ngIf="error" class="alert alert-error">
            ⚠️ {{ error }}
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button (click)="cerrar()" class="btn btn-secondary">
            Cancelar
          </button>
          <button
            (click)="guardarCambios()"
            [disabled]="cargando || !rutina"
            class="btn btn-success"
          >
            <span *ngIf="!cargando">✅ Guardar Cambios</span>
            <span *ngIf="cargando">Guardando...</span>
          </button>
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
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-contenido {
      background: linear-gradient(135deg, #1a1f2e 0%, #2a2f3e 100%);
      border: 1px solid #3a4050;
      border-radius: 0.75rem;
      max-width: 700px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
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
      position: sticky;
      top: 0;
      background: linear-gradient(135deg, #1a1f2e 0%, #2a2f3e 100%);
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

    .tabs-container {
      display: flex;
      border-bottom: 1px solid #3a4050;
      padding: 0 1.5rem;
      gap: 0;
    }

    .tab {
      flex: 1;
      padding: 1rem;
      border: none;
      background: transparent;
      color: #a0a0a0;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
      border-bottom: 3px solid transparent;
    }

    .tab:hover {
      color: #00d4ff;
    }

    .tab-activo {
      color: #00d4ff;
      border-bottom-color: #00d4ff;
    }

    .modal-body {
      padding: 2rem;
      max-height: calc(90vh - 200px);
      overflow-y: auto;
    }

    .tab-content {
      animation: fadeIn 0.2s ease;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #e0e0e0;
      font-size: 0.9rem;
    }

    .form-group small {
      display: block;
      color: #a0a0a0;
      font-size: 0.8rem;
      margin-top: 0.25rem;
    }

    .input,
    .textarea,
    .input-small,
    .textarea-small {
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
    .textarea:focus,
    .input-small:focus,
    .textarea-small:focus {
      outline: none;
      border-color: #00d4ff;
      box-shadow: 0 0 10px rgba(0, 212, 255, 0.2);
      background: #1a1f2e;
    }

    .input-small,
    .textarea-small {
      font-size: 0.85rem;
      padding: 0.5rem;
    }

    .textarea,
    .textarea-small {
      min-height: 80px;
      resize: vertical;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-top: 1rem;
    }

    .info-item {
      background: rgba(0, 212, 255, 0.1);
      border-left: 3px solid #00d4ff;
      padding: 0.75rem;
      border-radius: 0.25rem;
      color: #b0b0b0;
      font-size: 0.9rem;
    }

    .info-item strong {
      color: #00d4ff;
    }

    .dia-item {
      background: rgba(0, 212, 255, 0.05);
      border: 1px solid #3a4050;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }

    .dia-item h4 {
      color: #00d4ff;
      margin-top: 0;
      margin-bottom: 1rem;
    }

    .dia-ejercicios {
      margin-bottom: 2rem;
    }

    .dia-ejercicios h4 {
      color: #00d4ff;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #3a4050;
    }

    .ejercicio-item {
      background: rgba(0, 212, 255, 0.05);
      border: 1px solid #3a4050;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }

    .ejercicio-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #3a4050;
    }

    .ejercicio-header span {
      color: #e0e0e0;
      font-weight: 600;
    }

    .btn-delete {
      background: #c41e3a;
      color: #fff;
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 1rem;
    }

    .btn-delete:hover {
      background: #ff6b6b;
      transform: scale(1.1);
    }

    .modal-footer {
      padding: 1.5rem;
      border-top: 1px solid #3a4050;
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      position: sticky;
      bottom: 0;
      background: linear-gradient(135deg, #1a1f2e 0%, #2a2f3e 100%);
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
      margin: 0;
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
export class EditarRutinaModalComponent {
  @Input() mostrar: boolean = false;
  @Input() rutina: RutinaGenerada | null = null;
  @Output() guardarEvent = new EventEmitter<RutinaGenerada>();
  @Output() cerrarEvent = new EventEmitter<void>();

  tabActivo: 'info' | 'dias' | 'ejercicios' = 'info';
  cargando: boolean = false;
  error: string = '';
  diaEnfoqueTexto: string[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['mostrar'] && changes['mostrar'].currentValue && this.rutina) {
      this.inicializarEdicion();
    }
  }

  private inicializarEdicion(): void {
    this.error = '';
    this.tabActivo = 'info';
    this.diaEnfoqueTexto = this.rutina?.dias?.map((d: DiaRutina) => d.grupos_enfoque.join(', ')) || [];
  }

  actualizarEnfoque(indice: number): void {
    if (this.rutina && this.rutina.dias && this.rutina.dias[indice]) {
      this.rutina.dias[indice].grupos_enfoque = this.diaEnfoqueTexto[indice]
        .split(',')
        .map(g => g.trim())
        .filter(g => g.length > 0);
    }
  }

  eliminarEjercicio(diaIdx: number, ejIdx: number): void {
    if (this.rutina && this.rutina.dias && this.rutina.dias[diaIdx]) {
      this.rutina.dias[diaIdx].ejercicios.splice(ejIdx, 1);
    }
  }

  guardarCambios(): void {
    if (!this.rutina || !this.rutina.nombre.trim()) {
      this.error = 'El nombre es obligatorio';
      return;
    }

    this.cargando = true;
    this.guardarEvent.emit(this.rutina);
  }

  cerrar(): void {
    this.diaEnfoqueTexto = [];
    this.error = '';
    this.cerrarEvent.emit();
  }
}