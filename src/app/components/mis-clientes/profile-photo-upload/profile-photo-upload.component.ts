// src/app/components/profile-photo-upload/profile-photo-upload.component.ts

import { Component, OnInit, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadService } from '../../../core/services/upload.service';

@Component({
  selector: 'app-profile-photo-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="upload-container">
      <!-- Vista previa de imagen -->
      <div class="preview-section">
        <img 
          *ngIf="previewUrl" 
          [src]="previewUrl" 
          alt="Vista previa"
          class="preview-image"
        />
        <div *ngIf="!previewUrl" class="preview-placeholder">
          <span class="icon">📸</span>
          <p>Sin imagen seleccionada</p>
        </div>
      </div>

      <!-- Input de archivo oculto -->
      <input 
        #fileInput
        type="file" 
        accept="image/*"
        hidden
        (change)="onFileSelected($event)"
      />

      <!-- Botones de acción -->
      <div class="actions">
        <button 
          class="btn btn-primary"
          (click)="fileInput.click()"
          [disabled]="isUploading"
        >
          <span *ngIf="!isUploading">📁 Seleccionar imagen</span>
          <span *ngIf="isUploading">⏳ Cargando...</span>
        </button>

        <button 
          *ngIf="previewUrl && !isUploading"
          class="btn btn-danger"
          (click)="clearPreview()"
        >
          🗑️ Limpiar
        </button>
      </div>

      <!-- Barra de progreso -->
      <div *ngIf="isUploading" class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="uploadProgress"></div>
        </div>
        <p class="progress-text">{{ uploadProgress }}%</p>
      </div>

      <!-- Información del archivo -->
      <div *ngIf="selectedFile" class="file-info">
        <p><strong>Archivo:</strong> {{ selectedFile.name }}</p>
        <p><strong>Tamaño:</strong> {{ formatFileSize(selectedFile.size) }}</p>
        <p *ngIf="uploadedUrl" class="success">
          <strong>✅ Subido correctamente</strong>
        </p>
      </div>

      <!-- Mensajes de error -->
      <div *ngIf="error" class="error-message">
        <p>❌ {{ error }}</p>
      </div>
    </div>
  `,
  styles: [`
    .upload-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      border: 1px solid rgba(0, 168, 132, 0.2);
    }

    .preview-section {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
      background: rgba(20, 30, 45, 0.5);
      border-radius: 10px;
      border: 2px dashed rgba(0, 168, 132, 0.3);
      overflow: hidden;
    }

    .preview-image {
      max-width: 100%;
      max-height: 300px;
      object-fit: contain;
    }

    .preview-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      color: #8696a0;
      text-align: center;
    }

    .preview-placeholder .icon {
      font-size: 3rem;
    }

    .actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, #00a884 0%, #008c6f 100%);
      color: white;
      flex: 1;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 168, 132, 0.4);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-danger {
      background: rgba(239, 68, 68, 0.2);
      color: #fecaca;
      border: 1px solid rgba(239, 68, 68, 0.5);
    }

    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.3);
    }

    .progress-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .progress-bar {
      height: 8px;
      background: rgba(0, 168, 132, 0.2);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #00a884 0%, #008c6f 100%);
      transition: width 0.3s ease;
    }

    .progress-text {
      text-align: center;
      font-size: 0.85rem;
      color: #00a884;
      font-weight: 600;
    }

    .file-info {
      padding: 1rem;
      background: rgba(20, 30, 45, 0.5);
      border-radius: 8px;
      border-left: 3px solid rgba(0, 168, 132, 0.5);
      color: #ffffff;
      font-size: 0.9rem;
    }

    .file-info p {
      margin: 0.25rem 0;
    }

    .file-info .success {
      color: #86efac;
      margin-top: 0.5rem;
    }

    .error-message {
      padding: 1rem;
      background: rgba(239, 68, 68, 0.15);
      border-radius: 8px;
      border-left: 3px solid #ef4444;
      color: #fecaca;
    }

    .error-message p {
      margin: 0;
    }
  `]
})
export class ProfilePhotoUploadComponent implements OnInit {
  private uploadService = inject(UploadService);

  @Input() currentImageUrl: string | null = null;
  @Output() uploadSuccess = new EventEmitter<string>();
  @Output() uploadError = new EventEmitter<string>();

  previewUrl: string | null = null;
  selectedFile: File | null = null;
  uploadProgress = 0;
  isUploading = false;
  error: string | null = null;
  uploadedUrl: string | undefined = undefined;

  ngOnInit(): void {
    // Mostrar imagen actual si existe
    if (this.currentImageUrl) {
      this.previewUrl = this.currentImageUrl;
    }

    // Suscribirse al progreso
    this.uploadService.getUploadProgress().subscribe(
      (progress: number) => this.uploadProgress = progress
    );

    // Suscribirse al estado de carga
    this.uploadService.getIsUploading().subscribe(
      (isUploading: boolean) => this.isUploading = isUploading
    );
  }

  /**
   * Maneja la selección de archivo
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.error = null;
    this.selectedFile = file;

    // Crear vista previa
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    // Subir automáticamente
    this.uploadFile(file);
  }

  /**
   * Sube el archivo al servidor
   */
  private uploadFile(file: File): void {
    console.log('📤 Iniciando upload de:', file.name);

    this.uploadService.uploadProfilePhoto(file).subscribe({
      next: (response: any) => {
        console.log('✅ Upload exitoso:', response);
        this.uploadedUrl = response.imagen ?? undefined;
        this.uploadSuccess.emit(response.imagen || '');
      },
      error: (error: any) => {
        console.error('❌ Error en upload:', error);
        const errorMessage = error?.error?.detail || 'Error al subir la imagen';
        this.error = errorMessage;
        this.uploadError.emit(errorMessage);
      }
    });
  }

  /**
   * Limpia la vista previa
   */
  clearPreview(): void {
    this.previewUrl = null;
    this.selectedFile = null;
    this.uploadedUrl = undefined;
    this.error = null;
    this.uploadProgress = 0;
  }

  /**
   * Formatea el tamaño del archivo
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}