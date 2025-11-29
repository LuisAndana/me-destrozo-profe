// src/app/core/services/upload.service.ts
// Servicio para manejar carga de imágenes

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpProgressEvent } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

interface UploadResponse {
  ok: boolean;
  mensaje: string;
  imagen?: string;
  url?: string;
  thumbnail?: string;
  tamaño: number;
  archivo: string;
  tipo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private http = inject(HttpClient);
  
  // Observable para rastrear el progreso de carga
  private uploadProgress$ = new BehaviorSubject<number>(0);
  private isUploading$ = new BehaviorSubject<boolean>(false);
  
  // Configuración
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  // URLs
  private readonly API_BASE = environment.apiBase;
  private readonly UPLOAD_URL = `${this.API_BASE}/upload`;
  
  /**
   * 📸 Sube la foto de perfil del usuario
   */
  uploadProfilePhoto(file: File): Observable<UploadResponse> {
    console.log('📸 [UPLOAD] Subiendo foto de perfil');
    console.log('📦 Archivo:', file.name, file.size, 'bytes');
    
    // Validar archivo
    this.validateFile(file);
    
    const formData = new FormData();
    formData.append('file', file);
    
    this.isUploading$.next(true);
    
    return new Observable(observer => {
      this.http.post<UploadResponse>(
        `${this.UPLOAD_URL}/profile-photo`,
        formData,
        {
          reportProgress: true,
          observe: 'events'
        }
      ).subscribe({
        next: (event: HttpEvent<any>) => {
          if (event.type === 4) { // HttpResponse
            console.log('✅ Foto subida correctamente');
            this.uploadProgress$.next(100);
            this.isUploading$.next(false);
            observer.next(event.body as UploadResponse);
            observer.complete();
          } else if (event.type === 1) { // HttpProgressEvent
            const progressEvent = event as HttpProgressEvent;
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
              this.uploadProgress$.next(progress);
              console.log(`⏳ Progreso: ${progress}%`);
            }
          }
        },
        error: (error) => {
          console.error('❌ Error en upload:', error);
          this.uploadProgress$.next(0);
          this.isUploading$.next(false);
          observer.error(error);
        }
      });
    });
  }
  
  /**
   * 🖼️ Sube una imagen genérica
   */
  uploadImage(file: File, type: string = 'general'): Observable<UploadResponse> {
    console.log(`🖼️ [UPLOAD] Subiendo imagen tipo: ${type}`);
    
    this.validateFile(file);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    this.isUploading$.next(true);
    
    return new Observable(observer => {
      this.http.post<UploadResponse>(
        `${this.UPLOAD_URL}/image`,
        formData,
        {
          reportProgress: true,
          observe: 'events'
        }
      ).subscribe({
        next: (event: HttpEvent<any>) => {
          if (event.type === 4) {
            console.log('✅ Imagen subida');
            this.uploadProgress$.next(100);
            this.isUploading$.next(false);
            observer.next(event.body as UploadResponse);
            observer.complete();
          } else if (event.type === 1) {
            const progressEvent = event as HttpProgressEvent;
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
              this.uploadProgress$.next(progress);
            }
          }
        },
        error: (error) => {
          console.error('❌ Error:', error);
          this.uploadProgress$.next(0);
          this.isUploading$.next(false);
          observer.error(error);
        }
      });
    });
  }
  
  /**
   * 📥 Obtiene una imagen del servidor
   */
  getImageUrl(filename: string): string {
    return `${this.UPLOAD_URL}/image/${filename}`;
  }
  
  /**
   * 🗑️ Elimina una imagen
   */
  deleteImage(filename: string): Observable<any> {
    console.log(`🗑️ [DELETE] Eliminando imagen: ${filename}`);
    
    return this.http.delete(
      `${this.UPLOAD_URL}/image/${filename}`
    );
  }
  
  /**
   * 🔍 Valida el archivo antes de subir
   */
  private validateFile(file: File): void {
    // Validar que existe
    if (!file) {
      throw new Error('No se seleccionó archivo');
    }
    
    // Validar tipo MIME
    if (!file.type.startsWith('image/')) {
      throw new Error('El archivo debe ser una imagen');
    }
    
    // Validar extensión
    const filename = file.name.toLowerCase();
    const hasValidExtension = this.ALLOWED_EXTENSIONS.some(ext => filename.endsWith(ext));
    if (!hasValidExtension) {
      throw new Error(`Extensiones permitidas: ${this.ALLOWED_EXTENSIONS.join(', ')}`);
    }
    
    // Validar tamaño
    if (file.size > this.MAX_FILE_SIZE) {
      const maxMb = this.MAX_FILE_SIZE / 1024 / 1024;
      throw new Error(`Archivo muy grande. Máximo: ${maxMb}MB`);
    }
    
    console.log('✅ Archivo válido');
  }
  
  /**
   * 📊 Observable del progreso de carga
   */
  getUploadProgress(): Observable<number> {
    return this.uploadProgress$.asObservable();
  }
  
  /**
   * ⏳ Observable si está cargando
   */
  getIsUploading(): Observable<boolean> {
    return this.isUploading$.asObservable();
  }
  
  /**
   * 🔄 Reinicia el progreso
   */
  resetProgress(): void {
    this.uploadProgress$.next(0);
    this.isUploading$.next(false);
  }
  
  /**
   * 📋 Obtiene información del servicio de uploads
   */
  getUploadHealth(): Observable<any> {
    return this.http.get(`${this.UPLOAD_URL}/health`);
  }
}