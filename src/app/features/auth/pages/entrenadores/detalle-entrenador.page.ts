import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { EntrenadorService } from '../../../../core/services/entrenador.service';
import { TrainerDetail } from '../../../../core/models/trainer.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-detalle-entrenador-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detalle-entrenador.page.html',
  styleUrls: ['./detalle-entrenador.page.css'],
})
export class DetalleEntrenadorPage {
  private route = inject(ActivatedRoute);
  private svc = inject(EntrenadorService);
  private router = inject(Router);

  // Para mostrar/ocultar el botón "Editar mi perfil" en el detalle
  currentUserId: number | null = (() => {
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

  vm$: Observable<TrainerDetail> = this.route.paramMap.pipe(
    map(pm => Number(pm.get('id'))),
    switchMap(id => this.svc.getEntrenadorDetalle(id))
  );

  editar(): void {
    this.router.navigate(['/entrenador/perfil']);
  }
}
