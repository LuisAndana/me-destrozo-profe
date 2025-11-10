import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { EntrenadorService } from '../../../../core/services/entrenador.service';
import {
  PerfilEntrenador,
  Modalidad,
  ItemEdu,
  ItemDip,
  ItemCur,
  ItemLog,
  TrainerDetail,
} from '../../../../core/models/trainer.model';

type MaybeUser = { id_usuario?: number; rol?: string; nombre?: string } | null;

@Component({
  selector: 'app-perfil-entrenador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil-entrenador.html',
  styleUrls: ['./perfil-entrenador.css'],
})
export class PerfilEntrenadorPage implements OnInit {
  nombre = 'Mi Perfil';
  inicial = 'M';
  fotoUrl: string | null = null;
  saving = false;
  loading = true;
  idEntrenador = 0;

  data: PerfilEntrenador = {
    resumen: '',
    especialidad: '',
    especialidades: [],
    experiencia: 0,
    certificaciones: '',
    modalidades: [],
    ciudad: '',
    precio: 0,
    educacion: [],
    diplomas: [],
    cursos: [],
    logros: [],
  };

  especialidadTemporal = '';
  ciudadesDisponibles: string[] = [
    'Culiacán','Mazatlán','Los Mochis','Guasave','Navolato','Mocorito',
    'Cosalá','Elota','Concordia','Rosario','San Ignacio','Escuinapa',
  ];
  modalidadesDisponibles: Modalidad[] = ['Online', 'Presencial'];

  constructor(
    private entrenadorService: EntrenadorService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.idEntrenador = this.resolveTrainerId();
    console.log('🆔 idEntrenador resuelto =', this.idEntrenador);

    if (!this.idEntrenador) {
      console.error('❌ No se pudo resolver el id del entrenador.');
      this.loading = false;
      return;
    }

    this.loadPerfil();
  }

  /** ================== RESOLVER ID ROBUSTO ================== */
  private resolveTrainerId(): number {
    const paramId = Number(this.route.snapshot.paramMap.get('id')) || 0;
    if (paramId) return paramId;

    const lsId = Number(localStorage.getItem('id_entrenador') || 0);
    if (lsId) return lsId;

    try {
      const raw = localStorage.getItem('usuario');
      const user: MaybeUser = raw ? JSON.parse(raw) : null;
      const uId = Number(user?.id_usuario || 0);
      if (uId) return uId;
    } catch {}

    const tok =
      localStorage.getItem('access_token') ||
      sessionStorage.getItem('access_token') ||
      localStorage.getItem('token');
    if (tok && tok.split('.').length === 3) {
      try {
        const payload = JSON.parse(atob(tok.split('.')[1]));
        const fromJwt =
          Number(payload?.id || 0) ||
          Number(payload?.uid || 0) ||
          Number(payload?.sub || 0);
        if (fromJwt) return fromJwt;
      } catch {}
    }

    return 0;
  }

  /** ================== CARGA UNIFICADA ================== */
  private loadPerfil(): void {
    this.loading = true;
    const id = this.idEntrenador;

    const reqPerfil = this.entrenadorService.getPerfil(id).pipe(
      catchError((err) => {
        console.warn('⚠️ getPerfil falló, usando valores por defecto', err);
        return of<PerfilEntrenador>({
          resumen: '',
          especialidad: '',
          especialidades: [],
          experiencia: 0,
          certificaciones: '',
          modalidades: [],
          ciudad: '',
          precio: 0,
          educacion: [],
          diplomas: [],
          cursos: [],
          logros: [],
        });
      })
    );

    const reqDetalle = this.entrenadorService.getEntrenadorDetalle(id).pipe(
      catchError((err) => {
        console.warn('⚠️ getEntrenadorDetalle falló', err);
        return of<TrainerDetail | null>(null);
      })
    );

    forkJoin({ perfil: reqPerfil, detalle: reqDetalle })
      .pipe(map(({ perfil, detalle }) => this.mergePerfil(perfil, detalle)))
      .subscribe({
        next: (merged) => {
          this.data = merged.perfil;
          this.fotoUrl = merged.fotoUrl ?? this.fotoUrl;
          this.nombre = merged.nombre ?? this.nombre;
          this.setInitials();
          this.loading = false;

          console.log('✅ Perfil unificado:', this.data);
          console.log('👤 nombre:', this.nombre, '🖼️ foto:', this.fotoUrl);
        },
        error: (err) => {
          console.error('❌ Error unificando perfil:', err);
          this.loading = false;
        },
      });
  }

  private mergePerfil(
    perfil: PerfilEntrenador,
    detalle: TrainerDetail | null
  ): { perfil: PerfilEntrenador; fotoUrl?: string | null; nombre?: string | null } {
    const out: PerfilEntrenador = {
      resumen: perfil.resumen ?? '',
      especialidad: perfil.especialidad ?? '',
      especialidades: perfil.especialidades ?? [],
      experiencia: perfil.experiencia ?? 0,
      certificaciones: perfil.certificaciones ?? '',
      // ✅ SANITIZAR A Modalidad[]
      modalidades: (
        (perfil.modalidades ?? []) as (string | Modalidad)[]
      )
        .map(v => (typeof v === 'string' ? v.trim() : v))
        .filter((v): v is Modalidad => v === 'Online' || v === 'Presencial'),
      ciudad: perfil.ciudad ?? '',
      precio: Number(perfil.precio ?? 0),
      educacion: perfil.educacion ?? [],
      diplomas: perfil.diplomas ?? [],
      cursos: perfil.cursos ?? [],
      logros: perfil.logros ?? [],
    };

    let fotoUrl: string | null | undefined = null;
    let nombre: string | null | undefined = null;

    if (detalle) {
      // ✅ sin fullname (no existe en el tipo)
      nombre = detalle?.nombre ?? null;
      // ✅ acceso seguro
      fotoUrl = (detalle as any).foto_url || (detalle as any).avatar_url || null;

      if (!out.especialidad && (detalle as any).especialidad) out.especialidad = (detalle as any).especialidad;
      if ((!out.experiencia || out.experiencia === 0) && (detalle as any).experiencia)
        out.experiencia = Number((detalle as any).experiencia) || 0;
      if (!out.ciudad && (detalle as any).ciudad) out.ciudad = (detalle as any).ciudad;

      if ((!out.precio || out.precio === 0) && (detalle as any).precio_mensual)
        out.precio = Number((detalle as any).precio_mensual) || 0;

      // ✅ fusionar modalidades con tipado correcto
      const detMods = Array.isArray((detalle as any).modalidades)
        ? ((detalle as any).modalidades as (string | Modalidad)[])
        : [];

      const baseMods = out.modalidades?.length ? out.modalidades : detMods;

      out.modalidades = baseMods
        .map(v => (typeof v === 'string' ? v.trim() : v))
        .filter((v): v is Modalidad => v === 'Online' || v === 'Presencial');
    }

    return { perfil: out, fotoUrl, nombre };
  }

  /** ================== GUARDAR ================== */
  save(): void {
    if (!this.idEntrenador) {
      alert('No se puede guardar sin ID de entrenador');
      return;
    }
    this.saving = true;

    const clean: PerfilEntrenador = {
      ...this.data,
      especialidades: (this.data.especialidades || []).map(s => String(s).trim()).filter(Boolean),
      // ✅ asegurar Modalidad[]
      modalidades: (this.data.modalidades || []).filter(
        (m): m is Modalidad => m === 'Online' || m === 'Presencial'
      ),
      precio: Number(this.data.precio || 0),
      experiencia: Number(this.data.experiencia || 0),
    };

    this.entrenadorService.updatePerfil(clean, this.idEntrenador).subscribe({
      next: (updated) => {
        this.data = updated;
        this.saving = false;
        alert('✅ Perfil guardado correctamente');
        this.loadPerfil();
      },
      error: (err) => {
        console.error('❌ Error guardando perfil:', err);
        this.saving = false;
        alert('Error al guardar el perfil: ' + (err.error?.detail || err.message));
      },
    });
  }

  cancel(): void {
    if (confirm('¿Estás seguro? Los cambios no guardados se perderán')) {
      this.loadPerfil();
    }
  }

  /** ================== AVATAR ================== */
  changeAvatar(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files || !files.length) return;

    this.entrenadorService.uploadAvatar(files[0], this.idEntrenador).subscribe({
      next: (res) => {
        this.fotoUrl = res.foto_url || res.url || null;
        alert('✅ Foto de perfil actualizada');
      },
      error: (err) => {
        console.error('❌ Error subiendo avatar:', err);
        alert('Error al subir la foto de perfil');
      },
    });
  }

  removeAvatar(): void {
    if (!confirm('¿Eliminar la foto de perfil?')) return;

    this.entrenadorService.deleteAvatar(this.idEntrenador).subscribe({
      next: () => {
        this.fotoUrl = null;
        alert('✅ Foto de perfil eliminada');
      },
      error: (err) => {
        console.error('❌ Error eliminando avatar:', err);
        alert('Error al eliminar la foto de perfil');
      },
    });
  }

  /** ================== UI helpers ================== */
  private setInitials(): void {
    const n = (this.nombre || 'M').trim();
    this.inicial = n ? n.charAt(0).toUpperCase() : 'M';
  }

  agregarEspecialidad(): void {
    const esp = this.especialidadTemporal.trim();
    if (esp && !this.data.especialidades?.includes(esp)) {
      this.data.especialidades = [...(this.data.especialidades || []), esp];
      this.especialidadTemporal = '';
    }
  }
  eliminarEspecialidad(i: number): void {
    this.data.especialidades = (this.data.especialidades || []).filter((_, idx) => idx !== i);
  }

  isModalidadSeleccionada(mod: Modalidad): boolean {
    return (this.data.modalidades || []).includes(mod);
  }
  toggleModalidad(mod: Modalidad): void {
    const mods = this.data.modalidades || [];
    this.data.modalidades = mods.includes(mod) ? mods.filter(m => m !== mod) : [...mods, mod];
  }

  addEdu(): void {
    this.data.educacion = [...(this.data.educacion || []),
      { titulo: '', institucion: '', inicio: '', fin: '', descripcion: '' }];
  }
  delEdu(i: number): void {
    this.data.educacion = (this.data.educacion || []).filter((_: ItemEdu, idx) => idx !== i);
  }

  onPickFileFor(type: string, index: number, event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files || !files.length) return;
    this.uploadAndSetUrl(files[0], type, index);
  }
  private uploadAndSetUrl(file: File, type: string, index: number): void {
    this.entrenadorService.uploadEvidence(file, this.idEntrenador).subscribe({
      next: (r) => {
        const url = r.url;
        const setUrl = (arr: any[]) => { if (arr?.[index]) arr[index].evidenciaUrl = url; };
        switch (type) {
          case 'educacion': setUrl(this.data.educacion!); break;
          case 'diplomas' : setUrl(this.data.diplomas! ); break;
          case 'cursos'   : setUrl(this.data.cursos!   ); break;
          case 'logros'   : setUrl(this.data.logros!   ); break;
        }
      },
      error: (err) => {
        console.error(`Error subiendo evidencia (${type}):`, err);
        alert('Error al subir el archivo');
      },
    });
  }

  addDiploma(): void {
    this.data.diplomas = [...(this.data.diplomas || []), { titulo: '', institucion: '', fecha: '' }];
  }
  delDiploma(i: number): void {
    this.data.diplomas = (this.data.diplomas || []).filter((_: ItemDip, idx) => idx !== i);
  }

  addCurso(): void {
    this.data.cursos = [...(this.data.cursos || []), { titulo: '', institucion: '', fecha: '' }];
  }
  delCurso(i: number): void {
    this.data.cursos = (this.data.cursos || []).filter((_: ItemCur, idx) => idx !== i);
  }

  addLogro(): void {
    this.data.logros = [...(this.data.logros || []), { titulo: '', anio: '', descripcion: '' }];
  }
  delLogro(i: number): void {
    this.data.logros = (this.data.logros || []).filter((_: ItemLog, idx) => idx !== i);
  }
}
