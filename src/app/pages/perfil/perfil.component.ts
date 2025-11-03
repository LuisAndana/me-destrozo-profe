import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators
} from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { PerfilService, PerfilVM } from '../../core/services/perfil.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit {
  form!: FormGroup;
  loading = true;
  saving = false;
  estado = '';

  // === Avatar ===
  inicial = '';
  avatarUrl: string | null = null;   // ahora reflejará foto_url del backend
  uploading = false;
  private readonly maxAvatarMB = 4;  // límite de tamaño

  enfermedadesCatalogo = [
    'Insuficiencia renal', 'Cáncer', 'Diabetes', 'Tiroides',
    'Hipertensión', 'Asma', 'Cardiopatía', 'Colesterol alto'
  ];

  constructor(private fb: FormBuilder, private api: PerfilService) {}

  get enfArray(): FormArray<FormControl<boolean>> {
    return this.form.get('enfermedades') as FormArray<FormControl<boolean>>;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre_completo: [{ value: '', disabled: true }],
      email: [{ value: '', disabled: true }],
      sexo: [''],
      peso_kg: [null, [Validators.min(0)]],
      estatura_cm: [null, [Validators.min(0)]],
      edad: [null, [Validators.min(0), Validators.max(120)]],
      imc: [{ value: '', disabled: true }],
      problemas: [''],
      enfermedades: this.fb.array(this.enfermedadesCatalogo.map(() => this.fb.control(false)))
    });

    this.form.get('peso_kg')?.valueChanges.subscribe(() => this.calcIMC());
    this.form.get('estatura_cm')?.valueChanges.subscribe(() => this.calcIMC());

    this.cargar();
  }

  private calcIMC() {
    const kg = Number(this.form.get('peso_kg')?.value);
    const cm = Number(this.form.get('estatura_cm')?.value);
    if (kg > 0 && cm > 0) {
      const imc = kg / Math.pow(cm / 100, 2);
      this.form.get('imc')?.setValue(imc.toFixed(1), { emitEvent: false });
    } else {
      this.form.get('imc')?.setValue('', { emitEvent: false });
    }
  }

  private refreshInicial() {
    const nombre = String(this.form.get('nombre_completo')?.value || '').trim();
    const email  = String(this.form.get('email')?.value || '').trim();

    let letters = '';
    if (nombre) {
      const parts = nombre.split(/\s+/).filter(Boolean);
      letters = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0];
    } else if (email) {
      letters = email[0];
    }
    this.inicial = (letters || ' ').toUpperCase();
  }

  cargar() {
    this.loading = true;
    this.estado = 'Cargando…';
    this.api.getPerfil()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (p: PerfilVM) => {
          this.form.patchValue({
            nombre_completo: p.nombre_completo || '',
            email: p.email || '',
            sexo: p.sexo || '',
            peso_kg: p.peso_kg ?? null,
            estatura_cm: p.estatura_cm ?? null,
            edad: p.edad ?? null,
            problemas: p.problemas ?? ''
          });

          const set = new Set(p.enfermedades || []);
          this.enfArray.controls.forEach((ctrl, i) => {
            ctrl.setValue(set.has(this.enfermedadesCatalogo[i]));
          });

          // Mostrar imagen desde el backend (foto_url)
          this.avatarUrl = p.foto_url || null;

          this.calcIMC();
          this.refreshInicial();
          this.estado = '';
        },
        error: () => (this.estado = 'No se pudo cargar el perfil')
      });
  }

  // === Selección / subida de foto ===
  onAvatarChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.estado = 'El archivo debe ser una imagen.';
      input.value = '';
      return;
    }
    const maxBytes = this.maxAvatarMB * 1024 * 1024;
    if (file.size > maxBytes) {
      this.estado = `La imagen supera ${this.maxAvatarMB} MB.`;
      input.value = '';
      return;
    }

    // Previsualización inmediata
    const reader = new FileReader();
    reader.onload = () => (this.avatarUrl = String(reader.result || ''));
    reader.readAsDataURL(file);

    // Subir al servidor
    this.uploading = true;
    this.estado = 'Subiendo foto…';
    this.api.uploadAvatar(file)
      .pipe(finalize(() => (this.uploading = false)))
      .subscribe({
        next: (r) => {
          // Asegurar compatibilidad con backend que usa foto_url
          const url = r.foto_url || r.avatar_url || null;
          this.avatarUrl = url ? `${url}?t=${Date.now()}` : null;
          this.estado = 'Foto actualizada';
        },
        error: () => {
          this.estado = 'No se pudo subir la foto';
        }
      });

    input.value = '';
  }

  // === Quitar foto ===
  removeAvatar() {
    if (!this.avatarUrl) return;
    this.uploading = true;
    this.estado = 'Quitando foto…';
    this.api.deleteAvatar()
      .pipe(finalize(() => (this.uploading = false)))
      .subscribe({
        next: () => {
          this.avatarUrl = null;
          this.estado = 'Foto eliminada';
        },
        error: () => (this.estado = 'No se pudo eliminar la foto')
      });
  }

  guardar() {
    if (this.form.invalid) return;

    const enfermedades: string[] = this.enfArray.controls
      .map((c, i) => (c.value ? this.enfermedadesCatalogo[i] : null))
      .filter((x): x is string => !!x);

    const payload = {
      sexo: this.form.value.sexo || null,
      peso_kg: this.form.value.peso_kg ?? null,
      estatura_cm: this.form.value.estatura_cm ?? null,
      edad: this.form.value.edad ?? null,
      problemas: (this.form.value.problemas || '').trim(),
      enfermedades
    };

    this.saving = true;
    this.estado = 'Guardando…';
    this.api.savePerfil(payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.estado = 'Cambios guardados';
          this.refreshInicial();
        },
        error: () => (this.estado = 'Error al guardar')
      });
  }

  cancelar() {
    this.cargar();
  }
}
