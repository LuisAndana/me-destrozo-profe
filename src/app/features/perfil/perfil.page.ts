// perfil.component.ts - VERSIÓN ACTUALIZADA CON DISEÑO PREMIUM
import { Component, ChangeDetectorRef, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ]
})
export class PerfilComponent implements OnInit {
  
  // ============================================================
  // PROPIEDADES
  // ============================================================
  nombre = 'Tu Nombre';
  inicial = 'T';
  avatarUrl: string | null = null;
  
  form!: FormGroup;
  uploading = signal<boolean>(false);
  saving = signal<boolean>(false);
  loading = signal<boolean>(false);
  
  // Catálogo de enfermedades
  enfermedadesCatalogo = [
    'Diabetes',
    'Hipertensión',
    'Asma',
    'Problemas de corazón',
    'Artritis',
    'Obesidad',
    'Tiroides',
    'Depresión'
  ];
  
  enfermedadesSeleccionadas = '';

  // Inyecciones
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private cd = inject(ChangeDetectorRef);

  // ============================================================
  // LIFECYCLE
  // ============================================================
  ngOnInit(): void {
    this.initForm();
    this.cargarDatosUsuario();
  }

  // ============================================================
  // INICIALIZACIÓN DE FORMULARIO
  // ============================================================
  private initForm(): void {
    this.form = this.fb.group({
      nombre_completo: [''],
      email: [''],
      sexo: [''],
      edad: [''],
      peso_kg: [''],
      estatura_cm: [''],
      problemas: [''],
      enfermedades: this.fb.array([])
    });

    // Inicializar el array de enfermedades
    this.inicializarEnfermedades();
  }

  private inicializarEnfermedades(): void {
    const grupo = this.form.get('enfermedades') as FormArray;
    grupo.clear();
    this.enfermedadesCatalogo.forEach(() => {
      grupo.push(new FormControl(false));
    });
  }

  getEnfermedadControl(index: number): FormControl {
    const grupo = this.form.get('enfermedades') as FormArray;
    return grupo.at(index) as FormControl;
  }

  get enfArray(): FormArray {
    return this.form.get('enfermedades') as FormArray;
  }

  // ============================================================
  // CARGA DE DATOS
  // ============================================================
  private cargarDatosUsuario(): void {
    try {
      const raw = localStorage.getItem('usuario');
      if (!raw) {
        this.router.navigate(['/']);
        return;
      }

      const usuario = JSON.parse(raw) as {
        id?: number;
        nombre?: string;
        apellido?: string;
        email?: string;
        fotoUrl?: string;
        sexo?: string;
        edad?: number;
        peso_kg?: number;
        estatura_cm?: number;
        problemas?: string;
        enfermedades?: string[];
      };

      // Nombre completo
      const nombreCompleto = [usuario?.nombre, usuario?.apellido]
        .filter(Boolean)
        .join(' ')
        .trim();
      
      this.nombre = nombreCompleto || usuario?.nombre || 'Tu Nombre';

      // Iniciales
      const partes = this.nombre.split(' ');
      if (partes.length >= 2) {
        this.inicial = (partes[0][0] + partes[1][0]).toUpperCase();
      } else {
        this.inicial = (partes[0]?.charAt(0) || 'T').toUpperCase();
      }

      // Avatar
      this.avatarUrl = (usuario?.fotoUrl && usuario.fotoUrl.trim() !== '') 
        ? usuario.fotoUrl 
        : null;

      // Actualizar formulario
      this.form.patchValue({
        nombre_completo: this.nombre,
        email: usuario?.email || '',
        sexo: usuario?.sexo || '',
        edad: usuario?.edad || '',
        peso_kg: usuario?.peso_kg || '',
        estatura_cm: usuario?.estatura_cm || '',
        problemas: usuario?.problemas || ''
      });

      // Enfermedades seleccionadas
      if (usuario?.enfermedades && Array.isArray(usuario.enfermedades)) {
        usuario.enfermedades.forEach((enf) => {
          const enfIndex = this.enfermedadesCatalogo.findIndex(e => e === enf);
          if (enfIndex >= 0) {
            this.enfArray.at(enfIndex)?.setValue(true);
          }
        });
        this.actualizarEnfermedadesSeleccionadas();
      }

      setTimeout(() => this.cd.detectChanges(), 0);
    } catch (error) {
      console.error('[Perfil] Error al cargar datos:', error);
      this.router.navigate(['/']);
    }
  }

  // ============================================================
  // CAMBIO DE AVATAR
  // ============================================================
  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.uploading.set(true);

      // Simular carga (reemplaza con tu servicio)
      const reader = new FileReader();
      reader.onload = (e) => {
        this.avatarUrl = e.target?.result as string;
        this.uploading.set(false);
        // TODO: Llamar a servicio para guardar en servidor
      };
      reader.readAsDataURL(file);
    }
  }

  removeAvatar(): void {
    this.avatarUrl = null;
    // TODO: Llamar a servicio para eliminar en servidor
  }

  // ============================================================
  // CÁLCULOS
  // ============================================================
  calcularIMC(): number {
    const peso = this.form.get('peso_kg')?.value;
    const estatura = this.form.get('estatura_cm')?.value;
    
    if (!peso || !estatura) return 0;
    
    const estaturaMetros = estatura / 100;
    return peso / (estaturaMetros * estaturaMetros);
  }

  actualizarEnfermedadesSeleccionadas(): void {
    const seleccionadas = this.enfArray.value
      .map((checked: boolean, idx: number) => checked ? this.enfermedadesCatalogo[idx] : null)
      .filter((e: string | null) => e !== null);
    
    this.enfermedadesSeleccionadas = seleccionadas.length > 0 
      ? seleccionadas.join(', ')
      : '';
  }

  // ============================================================
  // GUARDAR CAMBIOS
  // ============================================================
  guardar(): void {
    if (this.form.invalid) {
      console.warn('Formulario inválido');
      return;
    }

    this.saving.set(true);

    // Actualizar enfermedades seleccionadas
    this.actualizarEnfermedadesSeleccionadas();

    // Simular llamada a API
    setTimeout(() => {
      console.log('✅ Cambios guardados:', this.form.value);
      this.saving.set(false);
      this.cd.detectChanges();
    }, 1500);

    // TODO: Llamar a servicio para guardar cambios
  }

  cancelar(): void {
    this.router.navigate(['/cliente']);
  }
}