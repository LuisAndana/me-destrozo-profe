import { Component, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RutinaService, Rutina } from '../../../../core/services/rutina.service';

@Component({
  selector: 'app-rutina',
  standalone: true,
  imports: [CommonModule, FormsModule, TitleCasePipe],
  templateUrl: './rutina.component.html',
  styleUrls: ['./rutina.component.css']
})
export class RutinaComponent implements OnInit {
  rutina: Rutina[] = [];
  rutinaFiltrada: Rutina[] = [];
  cargando = false;
  error = '';
  semanaSeleccionada: string = '';
  idAlumno: number | null = null;

  constructor(private rutinaService: RutinaService) {}

  ngOnInit() {
    const alumnoGuardado = this.rutinaService.obtenerAlumnoSeleccionado();

    if (alumnoGuardado?.id_usuario) {
      this.idAlumno = alumnoGuardado.id_usuario;
    } else {
      const usuarioLocal = localStorage.getItem('usuario');
      if (usuarioLocal) {
        try {
          const usuario = JSON.parse(usuarioLocal);
          this.idAlumno = usuario.id_usuario || usuario.id || null;
        } catch {
          console.warn('⚠️ Error al parsear el usuario de localStorage');
        }
      }
    }

    if (this.idAlumno) {
      this.cargarRutina(this.idAlumno);
    } else {
      this.error = '⚠️ No se ha identificado el alumno actual. Inicia sesión nuevamente.';
    }
  }

  /**
   * 🔹 Cargar rutinas desde el backend
   */
  cargarRutina(idAlumno: number) {
    this.cargando = true;
    this.error = '';

    this.rutinaService.obtenerRutinasAlumno(idAlumno).subscribe({
      next: (data) => {
        console.log('✅ Rutinas obtenidas:', data);
        // ✅ Mostrar solo la rutina más reciente por día
        this.rutina = this.obtenerRutinasMasRecientesPorDia(data);
        this.rutinaFiltrada = [...this.rutina];
        this.cargando = false;
      },
      error: (err) => {
        console.error('❌ Error al obtener rutinas:', err);
        this.error = '❌ No se pudieron cargar las rutinas. Intenta más tarde.';
        this.cargando = false;
      }
    });
  }

  /**
   * 🔹 Filtrar rutinas por semana seleccionada
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
   * 🔹 Mantiene solo la rutina más reciente por día
   */
  obtenerRutinasMasRecientesPorDia(rutinas: Rutina[]): Rutina[] {
    const mapa: Record<string, Rutina> = {};

    rutinas.forEach((r) => {
      const fecha = new Date(r.fecha_creacion).toDateString();
      if (!mapa[fecha] || new Date(r.fecha_creacion) > new Date(mapa[fecha].fecha_creacion)) {
        mapa[fecha] = r;
      }
    });

    return Object.values(mapa).sort(
      (a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
    );
  }
}
