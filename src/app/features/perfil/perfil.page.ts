import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, NgOptimizedImage } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClienteService, UserProfile } from '../../core/services/cliente.service';
import { AuthService } from '../../core/services/auth.service';

interface Cambio {
  campo: string;
  antes: string | number | null;
  despues: string | number | null;
  fecha: Date;
}

@Component({
  standalone: true,
  selector: 'app-perfil-page',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    NgOptimizedImage,
    DatePipe
  ],
})
export class PerfilPage {
  private readonly cliente = inject(ClienteService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  perfil = signal<UserProfile | null>(null);
  cambiosOpen = signal(false);
  cambios = signal<Cambio[]>([]);
  guardando = signal(false);
  previewUrl = signal<string | null>(null);

  form: FormGroup = this.fb.group({
    nombre: [''],
    email: [{ value: '', disabled: true }],
    sexo: [''],
    edad: [null],
    pesoKg: [null],
    estaturaCm: [null],
    problemas: [''],
    enfermedades: ['']
  });

  constructor() {
    this.loadPerfil();
  }

  private loadPerfil(): void {
    this.cliente.getPerfil().subscribe({
      next: (p: UserProfile) => {
        this.perfil.set(p);
        this.form.patchValue(p);
      },
      error: (err) => console.error('Error al obtener perfil:', err),
    });
  }

  imc(): number | null {
    const peso = this.form.get('pesoKg')?.value;
    const estatura = this.form.get('estaturaCm')?.value;
    if (!peso || !estatura) return null;
    const metros = estatura / 100;
    return +(peso / (metros * metros)).toFixed(2);
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.guardando.set(true);

    const actual = this.perfil();
    const nuevo = this.form.getRawValue();
    const cambiosHechos: Cambio[] = [];

    if (actual) {
      Object.keys(nuevo).forEach((campo) => {
        const antes = (actual as any)[campo];
        const despues = (nuevo as any)[campo];
        if (antes !== despues) cambiosHechos.push({ campo, antes, despues, fecha: new Date() });
      });
    }

    this.cambios.set([...this.cambios(), ...cambiosHechos]);

    this.cliente.updatePerfil(nuevo).subscribe({
      next: (p) => {
        this.perfil.set(p);
        this.guardando.set(false);
      },
      error: (err) => {
        console.error('Error al actualizar perfil:', err);
        this.guardando.set(false);
      },
    });
  }

  seleccionarAvatar(input: HTMLInputElement): void {
    input.click();
  }

  onFileSelected(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(reader.result as string);
    reader.readAsDataURL(file);

    this.cliente.uploadAvatar(file).subscribe({
      next: () => this.loadPerfil(),
      error: (err) => console.error('Error al subir avatar:', err),
    });
  }
}
