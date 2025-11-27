import { Component, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RutinaService, Rutina } from '../../../../core/services/rutina.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-rutina',
  standalone: true,
  imports: [CommonModule, FormsModule, TitleCasePipe],
  templateUrl: './rutina.component.html',
  styleUrls: ['./rutina.component.css']
})
export class RutinaComponent implements OnInit {
  // ============================================================
  // 🔹 PROPIEDADES DEL COMPONENTE
  // ============================================================

  rutina: Rutina[] = [];
  rutinaFiltrada: Rutina[] = [];
  cargando = false;
  error = '';
  semanaSeleccionada: string = '';
  idAlumno: number | null = null;

  constructor(
    private rutinaService: RutinaService,
    private router: Router
  ) {}

  // ============================================================
  // 🔹 INICIALIZACIÓN
  // ============================================================

  ngOnInit() {
    console.log('%c=== COMPONENTE RUTINA - INICIANDO ===', 'color: blue; font-weight: bold; font-size: 12px');

    // ✅ PASO 1: Obtener el ID del usuario actual
    this.idAlumno = this.obtenerIdUsuarioActual();

    if (this.idAlumno) {
      console.log(`✅ ID del usuario actual: ${this.idAlumno}`);
      this.cargarRutina(this.idAlumno);
    } else {
      this.error = '⚠️ No se ha identificado el usuario. Inicia sesión nuevamente.';
      console.error('❌ No se pudo obtener el ID del usuario');
    }
  }

  // ============================================================
  // 🔹 OBTENER ID DEL USUARIO (Múltiples fuentes)
  // ============================================================

  /**
   * ✅ MEJORADO: Obtener ID de múltiples fuentes
   */
  obtenerIdUsuarioActual(): number | null {
    console.log('🔍 Buscando ID del usuario...');

    // Opción 1: Desde el servicio (si está cacheado)
    const alumnoEnServicio = this.rutinaService.obtenerAlumnoSeleccionado();
    if (alumnoEnServicio?.id_usuario) {
      console.log(`   ✅ Encontrado en servicio: ${alumnoEnServicio.id_usuario}`);
      return alumnoEnServicio.id_usuario;
    }

    // Opción 2: Desde localStorage
    const usuarioLocal = localStorage.getItem('usuario');
    if (usuarioLocal) {
      try {
        const usuario = JSON.parse(usuarioLocal);
        const id = usuario.id_usuario || usuario.id;
        if (id) {
          console.log(`   ✅ Encontrado en localStorage: ${id}`);
          return id;
        }
      } catch (e) {
        console.warn('   ⚠️ Error al parsear usuario de localStorage:', e);
      }
    }

    // Opción 3: Desde sessionStorage
    const usuarioSession = sessionStorage.getItem('usuario');
    if (usuarioSession) {
      try {
        const usuario = JSON.parse(usuarioSession);
        const id = usuario.id_usuario || usuario.id;
        if (id) {
          console.log(`   ✅ Encontrado en sessionStorage: ${id}`);
          return id;
        }
      } catch (e) {
        console.warn('   ⚠️ Error al parsear usuario de sessionStorage:', e);
      }
    }

    console.error('   ❌ No se encontró el ID del usuario en ninguna fuente');
    return null;
  }

  // ============================================================
  // 🔹 CARGAR RUTINAS
  // ============================================================

  /**
   * ✅ MEJORADO: Cargar rutinas desde el backend con mejor error handling
   */
  cargarRutina(idAlumno: number) {
    console.log(`\n📋 CARGANDO RUTINAS PARA ID: ${idAlumno}`);
    this.cargando = true;
    this.error = '';
    this.rutina = [];
    this.rutinaFiltrada = [];

    this.rutinaService.obtenerRutinasAlumno(idAlumno).subscribe({
      next: (data) => {
        console.log('✅ Respuesta recibida del servidor:', data);

        if (!data || data.length === 0) {
          console.warn('⚠️ El servidor retornó una lista vacía');
          this.error = '📭 No tienes rutinas asignadas aún. Tu entrenador las creará pronto.';
          this.rutina = [];
          this.rutinaFiltrada = [];
          this.cargando = false;
          return;
        }

        console.log(`✅ Se cargaron ${data.length} rutinas`);

        // ✅ Procesar y mostrar las rutinas
        this.rutina = data;
        this.rutinaFiltrada = this.obtenerRutinasMasRecientesPorDia(data);

        console.log(`✅ Total de rutinas después de filtrar: ${this.rutinaFiltrada.length}`);

        this.cargando = false;
        this.error = '';
      },
      error: (err) => {
        console.error('❌ Error al obtener rutinas:', err);
        console.error('   Status:', err.status);
        console.error('   Message:', err.message);
        console.error('   Error completo:', err);

        // ✅ MEJORADO: Mensajes específicos por tipo de error
        if (err.status === 404) {
          this.error = '📭 No hay rutinas asignadas para este usuario.';
        } else if (err.status === 500) {
          this.error = '⚠️ Error del servidor. Por favor intenta más tarde.';
        } else if (err.status === 0) {
          this.error = '🌐 Error de conexión. Verifica tu conexión a internet.';
        } else {
          this.error = `❌ Error al cargar las rutinas: ${err.message}`;
        }

        this.rutina = [];
        this.rutinaFiltrada = [];
        this.cargando = false;
      }
    });
  }

  // ============================================================
  // 🔹 FILTRADO Y PROCESAMIENTO
  // ============================================================

  /**
   * Filtrar rutinas por semana seleccionada
   */
  filtrarPorSemana() {
    if (!this.semanaSeleccionada) {
      this.rutinaFiltrada = [...this.rutina];
      return;
    }

    const [anio, semana] = this.semanaSeleccionada.split('-W').map(Number);
    const primerDia = new Date(anio, 0, (semana - 1) * 7 + 1);
    const ultimoDia = new Date(primerDia);
    ultimoDia.setDate(primerDia.getDate() + 6);

    this.rutinaFiltrada = this.rutina.filter((r) => {
      const fecha = new Date(r.fecha_creacion);
      return fecha >= primerDia && fecha <= ultimoDia;
    });
  }

  /**
   * 📊 Obtener solo la rutina más reciente por fecha
   */
  obtenerRutinasMasRecientesPorDia(rutinas: Rutina[]): Rutina[] {
    if (!rutinas || rutinas.length === 0) {
      return [];
    }

    // Mapear por fecha (más reciente primero)
    return rutinas.sort((a, b) => {
      const fechaA = new Date(a.fecha_creacion || 0).getTime();
      const fechaB = new Date(b.fecha_creacion || 0).getTime();
      return fechaB - fechaA;
    });
  }

  // ============================================================
  // 🔹 NAVEGACIÓN
  // ============================================================

  /**
   * Navegar a la página de progresión del cliente
   */
  irProgresionCliente() {
    if (!this.idAlumno) {
      console.warn('⚠️ No hay alumno seleccionado');
      return;
    }
    console.log(`🚀 Navegando a progresión del cliente: ${this.idAlumno}`);
    this.router.navigate(['/progresion-cliente', this.idAlumno]);
  }

  // ============================================================
  // 🔹 UTILIDADES
  // ============================================================

  /**
   * 🔄 Refrescar rutinas manualmente
   */
  refrescarRutinas(): void {
    if (this.idAlumno) {
      console.log('🔄 Refrescando rutinas...');
      this.cargarRutina(this.idAlumno);
    }
  }

  /**
   * 👁️ Ver detalle de rutina
   */
  verDetalleRutina(idRutina: number): void {
    console.log(`👁️ Viendo detalle de rutina: ${idRutina}`);
    // Implementar: redirigir o mostrar modal con detalles
  }
}