import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TrainerOut } from '../../../../../core/models/trainer.model';

@Component({
  selector: 'app-entrenador-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './entrenador-card.component.html',
  styleUrls: ['./entrenador-card.component.css'],
})
export class EntrenadorCardComponent {
  @Input() trainer!: TrainerOut;

  private router = inject(Router);

  // URL del backend en producción
  private readonly BACKEND_URL = 'https://web-production-03d9e.up.railway.app';

  // ID del usuario autenticado (desde localStorage)
  private currentUserId: number | null = (() => {
    try {
      const raw = localStorage.getItem('usuario');
      if (!raw) return null;
      const u = JSON.parse(raw);
      const id = Number(u?.id ?? u?.id_usuario);
      return Number.isFinite(id) ? id : null;
    } catch {
      return null;
    }
  })();

  // Usado por la plantilla (*ngIf="isMine")
  get isMine(): boolean {
    return this.trainer?.id != null && this.currentUserId === this.trainer.id;
  }

  /**
   * ✅ Obtiene la URL de la foto del entrenador, corrigiendo URLs de localhost
   */
  getFotoEntrenador(): string {
    const foto = this.trainer?.foto_url;
    
    // Si no hay foto, retornar string vacío (se mostrará placeholder)
    if (!foto || foto.trim() === '') {
      return '';
    }
    
    // 1. Si ya es una URL completa (http/https), devolver tal cual
    if (foto.startsWith('http://') || foto.startsWith('https://')) {
      return foto;
    }
    
    // 2. Si es ruta relativa /uploads/..., construir URL del backend Railway
    if (foto.startsWith('/uploads/')) {
      const urlCompleta = `${this.BACKEND_URL}${foto}`;
      console.log(`🖼️ URL Railway construida: ${urlCompleta}`);
      return urlCompleta;
    }
    
    // 3. Si es data:image/... (imagen en base64)
    if (foto.startsWith('data:')) {
      return foto;
    }
    
    // 4. Si contiene localhost o 127.0.0.1 (legacy - reemplazar con Railway)
    if (foto.includes('localhost') || foto.includes('127.0.0.1') || foto.includes('0.0.0.0')) {
      console.warn(`⚠️ URL localhost detectada (legacy): ${foto}`);
      // Intentar extraer el path y reemplazar con Railway
      const cleanPath = foto.split('localhost:8000')[1] || 
                       foto.split('127.0.0.1:8000')[1] || 
                       foto.split('0.0.0.0:8000')[1];
      if (cleanPath) {
        const fixedUrl = `${this.BACKEND_URL}${cleanPath}`;
        console.log(`🔧 URL corregida a Railway: ${fixedUrl}`);
        return fixedUrl;
      }
      // Si no se puede extraer el path, retornar vacío
      return '';
    }
    
    // 5. Por defecto, intentar como ruta relativa desde backend Railway
    const finalUrl = foto.startsWith('/') ? `${this.BACKEND_URL}${foto}` : `${this.BACKEND_URL}/${foto}`;
    console.log(`🖼️ URL final: ${finalUrl}`);
    return finalUrl;
  }

  /**
   * ✅ Obtiene las iniciales del entrenador para el placeholder
   */
  getIniciales(): string {
    const nombre = this.trainer?.nombre || 'E';
    return nombre.charAt(0).toUpperCase();
  }

  verPerfil(): void {
    if (!this.trainer || this.trainer.id == null) return;
    this.router.navigate(['/entrenadores', this.trainer.id]);
  }

  editarMiPerfil(): void {
    this.router.navigate(['/entrenador/perfil']);
  }
}