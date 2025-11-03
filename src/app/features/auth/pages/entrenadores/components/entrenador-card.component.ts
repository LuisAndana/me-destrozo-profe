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

  verPerfil(): void {
    if (!this.trainer || this.trainer.id == null) return;
    this.router.navigate(['/entrenadores', this.trainer.id]);
  }

  editarMiPerfil(): void {
    this.router.navigate(['/entrenador/perfil']);
  }
}
