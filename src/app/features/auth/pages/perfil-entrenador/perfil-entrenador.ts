// src/app/features/auth/pages/perfil-entrenador/perfil-entrenador.ts
import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { EntrenadorService } from '../../../../core/services/entrenador.service';
import { PerfilEntrenador } from '../../../../core/models/trainer.model';

@Component({
  standalone: true,
  selector: 'app-perfil-entrenador',
  templateUrl: './perfil-entrenador.html',
  styleUrls: ['./perfil-entrenador.css'],
  imports: [CommonModule, FormsModule, RouterModule],
})
export class PerfilEntrenadorPage implements OnInit {
  edit = true;          // Entramos directo en modo edición
  saving = false;

  nombre = 'Entrenador';
  inicial = 'E';
  fotoUrl = '';

  data: PerfilEntrenador = { resumen: '', educacion: [], diplomas: [], cursos: [], logros: [] };

  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);
  private api = inject(EntrenadorService);

  ngOnInit(): void {
    try {
      const raw = localStorage.getItem('usuario');
      if (!raw) { this.router.navigate(['/login']); return; }
      const u = JSON.parse(raw) as { nombre?: string; apellido?: string; fotoUrl?: string; foto_url?: string; };
      const full = [u?.nombre, u?.apellido].filter(Boolean).join(' ').trim();
      this.nombre = full || u?.nombre || this.nombre;

      const partes = this.nombre.split(' ');
      this.inicial = (partes[0]?.[0] || 'E').toUpperCase() + (partes[1]?.[0] || '').toUpperCase();
      this.fotoUrl = (u?.fotoUrl || u?.foto_url || '').trim();
    } catch {}
    this.load();
  }

  // ------- Carga / guarda -------
  load(): void {
    this.api.getPerfil().subscribe({
      next: (res) => { this.data = { ...this.data, ...res }; this.cd.detectChanges(); },
      error: (e) => console.warn('[PerfilEntrenador] getPerfil error:', e),
    });
  }

  save(): void {
    this.saving = true;
    this.api.updatePerfil(this.data).subscribe({
      next: () => { this.saving = false; this.edit = false; alert('Perfil guardado'); },
      error: (e) => { this.saving = false; console.warn('[PerfilEntrenador] updatePerfil error:', e); alert('Error al guardar'); },
    });
  }

  cancel(): void {
    this.router.navigate(['/entrenador/home']);
  }

  // ------- Avatar -------
  changeAvatar(ev: Event): void {
    const file = (ev.target as HTMLInputElement)?.files?.[0];
    if (!file) return;
    this.api.uploadAvatar(file).subscribe({
      next: (r: any) => {
        const newUrl = r?.foto_url ?? r?.url ?? '';
        if (!newUrl) return;
        this.fotoUrl = newUrl;
        try {
          const raw = localStorage.getItem('usuario');
          if (raw) {
            const u = JSON.parse(raw);
            u.fotoUrl = newUrl; u.foto_url = newUrl;
            localStorage.setItem('usuario', JSON.stringify(u));
          }
        } catch {}
        this.cd.detectChanges();
      },
      error: (e) => console.warn('[PerfilEntrenador] uploadAvatar error:', e),
    });
  }

  removeAvatar(): void {
    this.api.deleteAvatar().subscribe({
      next: () => {
        this.fotoUrl = '';
        try {
          const raw = localStorage.getItem('usuario');
          if (raw) {
            const u = JSON.parse(raw);
            u.fotoUrl = ''; u.foto_url = '';
            localStorage.setItem('usuario', JSON.stringify(u));
          }
        } catch {}
        this.cd.detectChanges();
      },
      error: (e) => console.warn('[PerfilEntrenador] deleteAvatar error:', e),
    });
  }

  // ------- Evidencias -------
  onPickFileFor(section: 'educacion'|'diplomas'|'cursos'|'logros', i: number, ev: Event): void {
    const file = (ev.target as HTMLInputElement)?.files?.[0];
    if (!file) return;
    this.api.uploadEvidence(file).subscribe({
      next: (r: any) => {
        const url = r?.url ?? '';
        if (url) (this.data as any)[section][i].evidenciaUrl = url;
        this.cd.detectChanges();
      },
      error: (e) => console.warn('[PerfilEntrenador] uploadEvidence error:', e),
    });
  }

  // ------- Helpers UI -------
  trackByIndex(i: number) { return i; }

  addEdu()      { this.data.educacion = this.data.educacion || []; this.data.educacion.push({}); }
  delEdu(i: number)      { this.data.educacion?.splice(i, 1); }
  addDiploma()  { this.data.diplomas = this.data.diplomas || []; this.data.diplomas.push({}); }
  delDiploma(i: number)  { this.data.diplomas?.splice(i, 1); }
  addCurso()    { this.data.cursos = this.data.cursos || []; this.data.cursos.push({}); }
  delCurso(i: number)    { this.data.cursos?.splice(i, 1); }
  addLogro()    { this.data.logros = this.data.logros || []; this.data.logros.push({}); }
  delLogro(i: number)    { this.data.logros?.splice(i, 1); }
}
