// src/app/core/components/confirm-logout-modal/confirm-logout-modal.component.ts
import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-logout-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" *ngIf="isOpen" (click)="onCancel()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Confirmar cierre de sesión</h2>
          <button class="modal-close" (click)="onCancel()">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="warning-icon">⚠️</div>
          <p>¿Estás seguro de que deseas cerrar sesión?</p>
          <p class="modal-subtitle">Serás redirigido a la página de inicio.</p>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-cancel" (click)="onCancel()">
            Cancelar
          </button>
          <button class="btn btn-confirm" (click)="onConfirm()">
            Sí, cerrar sesión
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .modal-content {
      background: #1c1f24;
      border: 1px solid #2a2f37;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      max-width: 420px;
      width: 90%;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px;
      border-bottom: 1px solid #2a2f37;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.3rem;
      font-weight: 700;
      color: #ffffff;
    }

    .modal-close {
      background: none;
      border: none;
      color: #9aa3af;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .modal-close:hover {
      background: #252a33;
      color: #e7e9ee;
    }

    .modal-body {
      padding: 32px 24px;
      text-align: center;
    }

    .warning-icon {
      font-size: 3rem;
      margin-bottom: 16px;
    }

    .modal-body p {
      margin: 0 0 8px 0;
      color: #e7e9ee;
      font-size: 1rem;
      line-height: 1.5;
    }

    .modal-subtitle {
      color: #9aa3af;
      font-size: 0.95rem;
    }

    .modal-footer {
      display: flex;
      gap: 12px;
      padding: 24px;
      border-top: 1px solid #2a2f37;
    }

    .btn {
      flex: 1;
      padding: 12px 20px;
      border-radius: 10px;
      border: none;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
    }

    .btn-cancel {
      background: #252a33;
      color: #e7e9ee;
      border: 1px solid #3a4a50;
    }

    .btn-cancel:hover {
      background: #2f3a45;
      border-color: #4a5a60;
    }

    .btn-confirm {
      background: #ff6b6b;
      color: #ffffff;
      border: 1px solid #ff6b6b;
    }

    .btn-confirm:hover {
      background: #ff5252;
      border-color: #ff5252;
      box-shadow: 0 8px 24px rgba(255, 107, 107, 0.3);
    }

    .btn:active {
      transform: translateY(1px);
    }
  `]
})
export class ConfirmLogoutModalComponent {
  @Input() isOpen = false;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}