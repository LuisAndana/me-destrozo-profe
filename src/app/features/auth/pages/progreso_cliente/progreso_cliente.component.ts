// progreso_cliente.component.ts - VERSIÓN MEJORADA
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProgresoService, HistorialRutina, ProgresoEjercicio, AlertaProgresion, ObjetivoCliente, DashboardCliente } from '../../../../core/services/progreso.service';

export interface EjercicioProgreso {
  id_ejercicio: number;
  nombre: string;
  grupo_muscular: string;

  total_sesiones: number;

  peso_inicial: number | null;
  peso_actual: number | null;
  peso_maximo: number | null;

  progreso_total: number | null;
  porcentaje_mejora: number | null;

  ultima_sesion: string | null; // 🔥 IMPORTANTE → string|null
}



@Component({
  selector: 'app-progreso-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './progreso_cliente.component.html',
  styleUrls: ['./progreso_cliente.component.css']
})
export class ProgresoClienteComponent implements OnInit {

  

  // Exponer Math para usarlo en el template
  Math = Math;

  // Datos del cliente
  idCliente: number = 0;
  nombreCliente: string = '';
  
  // Dashboard
  dashboard: DashboardCliente | null = null;
  
  // Tabs
  tabActiva: 'dashboard' | 'historial' | 'alertas' | 'objetivos' | 'ejercicios' = 'dashboard';
  
  // Historial de rutinas
  historialRutinas: HistorialRutina[] = [];
  rutinaSeleccionada: HistorialRutina | null = null;
  
  // Alertas
  alertas: AlertaProgresion[] = [];
  alertasFiltradas: AlertaProgresion[] = [];
  filtroAlerta: 'todas' | 'pendiente' | 'vista' | 'atendida' = 'pendiente';
  
  // Objetivos
  objetivos: ObjetivoCliente[] = [];
  objetivosFiltrados: ObjetivoCliente[] = [];
  filtroObjetivo: 'todos' | 'pendiente' | 'en_progreso' | 'alcanzado' = 'en_progreso';
  
  // Ejercicios con progreso
  ejercicios: EjercicioProgreso[] = [];
  ejercicioSeleccionado: EjercicioProgreso | null = null;

  progresoEjercicio: ProgresoEjercicio[] = [];
  
  // Estados
  cargando: boolean = false;
  error: string = '';
  exito: string = '';
  
  // Modal de registro de progreso
  mostrarModalRegistro: boolean = false;
  
  // Formulario de registro
  registroForm = {
    id_historial: 0,
    id_ejercicio: 0,
    fecha_sesion: new Date().toISOString().slice(0, 16),
    peso_kg: null as number | null,
    series_completadas: 3,
    repeticiones_completadas: 10,
    rpe: 7,
    calidad_tecnica: 'buena' as 'excelente' | 'buena' | 'regular' | 'mala',
    estado_animo: 'bueno' as 'excelente' | 'bueno' | 'regular' | 'malo' | null,
    notas: '',
    dolor_molestias: ''
  };

  constructor(
    private route: ActivatedRoute,
    private progresoService: ProgresoService
  ) {}

  ngOnInit(): void {
  this.route.params.subscribe(params => {
    this.idCliente = +params['id'];

    if (this.idCliente) {

      // 🔥 NUEVO: generar alertas automáticamente al entrar
      this.progresoService.generarAlertasAutomaticas(this.idCliente)
        .subscribe(() => this.cargarAlertas());

      this.cargarDatos();
    }
  });
}
  

  /**
   * Carga todos los datos del cliente
   */
  cargarDatos(): void {
    this.cargarDashboard();
    this.cargarHistorialRutinas();
    this.cargarAlertas();
    this.cargarObjetivos();
  }

  /**
   * Carga el dashboard resumido
   */
  cargarDashboard(): void {
    this.cargando = true;
    this.progresoService.obtenerDashboardCliente(this.idCliente).subscribe({
      next: (data) => {
        this.dashboard = data;
        this.nombreCliente = data.nombre_cliente;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar dashboard:', err);
        this.error = 'Error al cargar el dashboard';
        this.cargando = false;
      }
    });
  }

  /**
   * Carga el historial de rutinas
   */
  cargarHistorialRutinas(): void {
    this.progresoService.obtenerHistorialCliente(this.idCliente).subscribe({
      next: (rutinas) => {
        this.historialRutinas = rutinas;
        
        // Seleccionar la rutina activa o la más reciente
        const rutinaActiva = rutinas.find(r => r.estado === 'activa');
        this.rutinaSeleccionada = rutinaActiva || rutinas[0] || null;
        
        if (this.rutinaSeleccionada) {
          this.cargarEjerciciosDeRutina();
        }
      },
      error: (err) => {
        console.error('Error al cargar historial:', err);
        this.error = 'Error al cargar el historial de rutinas';
      }
    });
  }

  /**
   * ✅ IMPLEMENTACIÓN REAL: Carga ejercicios con progreso de la rutina seleccionada
   */
  cargarEjerciciosDeRutina(): void {
    if (!this.rutinaSeleccionada) {
      this.ejercicios = [];
      return;
    }

    this.cargando = true;
    console.log('🔍 Cargando ejercicios de la rutina:', this.rutinaSeleccionada.id_historial);
    
    // ✅ Llamada real al backend usando el nuevo endpoint
    // ✅ Llamada real al backend usando el nuevo endpoint
this.progresoService.obtenerEjerciciosConProgreso(
  this.rutinaSeleccionada.id_historial,
  this.idCliente
).subscribe({
  next: (ejercicios) => {
    console.log('✅ Ejercicios cargados:', ejercicios);

    this.ejercicios = ejercicios.map(ej => ({
  id_ejercicio: ej.id_ejercicio,
  nombre: ej.nombre,
  grupo_muscular: ej.grupo_muscular,
  total_sesiones: ej.total_sesiones,
  peso_inicial: ej.peso_inicial ?? null,
  peso_actual: ej.peso_actual ?? null,
  peso_maximo: ej.peso_maximo ?? null,
  progreso_total: ej.progreso_total ?? null,
  porcentaje_mejora: ej.porcentaje_mejora ?? null,
  ultima_sesion: ej.ultima_sesion ?? null
}));


    this.cargando = false;
  },
  error: (err) => {
    console.error('❌ Error al cargar ejercicios:', err);
    this.error = 'Error al cargar los ejercicios de la rutina';
    this.ejercicios = [];
    this.cargando = false;
  }
});

  }

  /**
   * Carga las alertas del cliente
   */
  cargarAlertas(): void {
    this.progresoService.obtenerAlertasCliente(this.idCliente).subscribe({
      next: (alertas) => {
        this.alertas = alertas;
        this.filtrarAlertas();
      },
      error: (err) => {
        console.error('Error al cargar alertas:', err);
        this.error = 'Error al cargar las alertas';
      }
    });
  }

  /**
   * Carga los objetivos del cliente
   */
  cargarObjetivos(): void {
    this.progresoService.obtenerObjetivosCliente(this.idCliente).subscribe({
      next: (objetivos) => {
        this.objetivos = objetivos;
        this.filtrarObjetivos();
      },
      error: (err) => {
        console.error('Error al cargar objetivos:', err);
        this.error = 'Error al cargar los objetivos';
      }
    });
  }

  /**
   * Cambia de tab
   */
  cambiarTab(tab: 'dashboard' | 'historial' | 'alertas' | 'objetivos' | 'ejercicios'): void {
    this.tabActiva = tab;
    
    // Limpiar mensajes al cambiar de tab
    this.error = '';
    this.exito = '';
  }

  /**
   * Selecciona una rutina del historial
   */
  seleccionarRutina(rutina: HistorialRutina): void {
    this.rutinaSeleccionada = rutina;
    this.cargarEjerciciosDeRutina();
    
  }

  /**
   * Filtra alertas según el filtro seleccionado
   */
  filtrarAlertas(): void {
    if (this.filtroAlerta === 'todas') {
      this.alertasFiltradas = this.alertas;
    } else {
      this.alertasFiltradas = this.alertas.filter(a => a.estado === this.filtroAlerta);
    }
  }

  /**
   * Filtra objetivos según el filtro seleccionado
   */
  filtrarObjetivos(): void {
    if (this.filtroObjetivo === 'todos') {
      this.objetivosFiltrados = this.objetivos;
    } else {
      this.objetivosFiltrados = this.objetivos.filter(o => o.estado === this.filtroObjetivo);
    }
  }

  /**
   * Selecciona un ejercicio para ver su progreso detallado
   */
  seleccionarEjercicio(ejercicio: EjercicioProgreso): void {
    this.ejercicioSeleccionado = ejercicio;
    this.cargarProgresoEjercicio(ejercicio.id_ejercicio);
  }

  /**
   * Carga el progreso detallado de un ejercicio
   */
  cargarProgresoEjercicio(idEjercicio: number): void {
    this.cargando = true;
    this.progresoService.obtenerProgresoEjercicio(idEjercicio, this.idCliente).subscribe({
      next: (progreso) => {
        this.progresoEjercicio = progreso;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar progreso del ejercicio:', err);
        this.error = 'Error al cargar el progreso del ejercicio';
        this.cargando = false;
      }
    });
  }

  /**
   * Abre modal para registrar progreso
   */
  abrirModalRegistroProgreso(ejercicio: EjercicioProgreso): void {
  if (!this.rutinaSeleccionada) {
    this.error = 'No hay rutina activa seleccionada';
    return;
  }

  // ✅ IMPORTANTE: Establecer el ejercicio seleccionado
  this.ejercicioSeleccionado = ejercicio;

  this.registroForm = {
    id_historial: this.rutinaSeleccionada.id_historial,
    id_ejercicio: ejercicio.id_ejercicio,
    fecha_sesion: new Date().toISOString().slice(0, 16),
    peso_kg: ejercicio.peso_actual || null,
    series_completadas: 3,
    repeticiones_completadas: 10,
    rpe: 7,
    calidad_tecnica: 'buena',
    estado_animo: 'bueno',
    notas: '',
    dolor_molestias: ''
  };

  this.mostrarModalRegistro = true;
}
  /**
   * Cierra el modal de registro
   */
  cerrarModalRegistro(): void {
    this.mostrarModalRegistro = false;
  }

  /**
   * Registra progreso de ejercicio
   */
  registrarProgreso(): void {
  if (!this.ejercicioSeleccionado) {
    this.error = 'No hay ejercicio seleccionado';
    return;
  }

  if (!this.rutinaSeleccionada) {
    this.error = 'No hay rutina seleccionada';
    return;
  }

  if (!this.registroForm.peso_kg || this.registroForm.peso_kg <= 0) {
    this.error = 'Ingresa un peso válido';
    return;
  }

  this.cargando = true;
  this.error = '';

  this.progresoService.registrarSesion(
    this.ejercicioSeleccionado.id_ejercicio,
    this.idCliente,
    this.rutinaSeleccionada.id_historial,
    this.registroForm
  ).subscribe({
    next: () => {
      this.exito = '✓ Sesión registrada exitosamente';
      this.mostrarModalRegistro = false;
      this.cargando = false;

      // Recargar datos
      this.cargarDashboard();
      this.cargarProgresoEjercicio(this.ejercicioSeleccionado?.id_ejercicio!);
      this.cargarEjerciciosDeRutina();
      this.cargarAlertas();

      setTimeout(() => (this.exito = ''), 5000);
    },
    error: (err) => {
      console.error('❌ Error al registrar sesión:', err);
      this.error = 'Error al registrar sesión';
      this.cargando = false;
    }
  });
}


  /**
   * Analiza la progresión del cliente y genera alertas
   */
  analizarProgresion(): void {
    this.cargando = true;
    this.error = '';

    this.progresoService.analizarProgresion(this.idCliente).subscribe({
      next: (response) => {
        this.exito = `✓ Análisis completado. ${response.alertas_generadas} nuevas alertas generadas.`;
        this.cargando = false;
        
        // Recargar alertas
        this.cargarAlertas();
        
        setTimeout(() => this.exito = '', 5000);
      },
      error: (err) => {
        console.error('Error al analizar progresión:', err);
        this.error = 'Error al analizar la progresión';
        this.cargando = false;
      }
    });
  }

  // ============================================================
  // HELPERS PARA EL TEMPLATE
  // ============================================================

  /**
   * Formatea un número con decimales opcionales
   */
  formatearNumero(valor: number | null | undefined, decimales: number = 1): string {
    if (valor === null || valor === undefined) return '-';
    return valor.toFixed(decimales);
  }

  /**
   * Formatea una fecha
   */
  formatearFecha(fecha: string | Date | null): string {
    if (!fecha) return '-';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  /**
   * Obtiene el color según el estado del objetivo
   */
  getColorObjetivo(estado: string): string {
    const colores: { [key: string]: string } = {
      'pendiente': '#6c757d',
      'en_progreso': '#007bff',
      'alcanzado': '#28a745',
      'vencido': '#dc3545'
    };
    return colores[estado] || '#6c757d';
  }

  /**
   * Obtiene el color según la prioridad de la alerta
   */
  getColorAlerta(prioridad: string): string {
    const colores: { [key: string]: string } = {
      'alta': '#dc3545',
      'media': '#ffc107',
      'baja': '#17a2b8'
    };
    return colores[prioridad] || '#6c757d';
  }

  /**
   * Obtiene el emoji según el tipo de alerta
   */
  getEmojiAlerta(tipo: string): string {
    const emojis: { [key: string]: string } = {
      'estancamiento': '⚠️',
      'rutina_expira': '⏰',
      'sin_rutina': '📋',
      'record_personal': '🏆',
      'nuevo_objetivo': '🎯'
    };
    return emojis[tipo] || '📢';
  }

  /**
   * Obtiene clase CSS para la tendencia del progreso
   */
  getTendenciaClass(porcentaje: number | null): string {
    if (porcentaje === null) return '';
    if (porcentaje > 10) return 'tendencia-positiva';
    if (porcentaje < -10) return 'tendencia-negativa';
    return 'tendencia-neutral';
  }

  /**
   * Obtiene clase CSS para el estado de la rutina
   */
  getEstadoRutinaClass(estado: string): string {
    const clases: { [key: string]: string } = {
      'activa': 'estado-activa',
      'completada': 'estado-completada',
      'pausada': 'estado-pausada',
      'cancelada': 'estado-cancelada'
    };
    return clases[estado] || '';
  }

  /**
   * Calcula el color de la barra de progreso
   */
  getColorProgreso(porcentaje: number): string {
    if (porcentaje >= 75) return '#28a745';
    if (porcentaje >= 50) return '#ffc107';
    if (porcentaje >= 25) return '#fd7e14';
    return '#dc3545';
  }

  /** Devuelve un icono según el tipo de alerta */
getIconoAlerta(tipo: string): string {
  const iconos: { [key: string]: string } = {
    'estancamiento': '⚠️',
    'rutina_expira': '⏰',
    'sin_rutina': '📋',
    'record_personal': '🏆',
    'nuevo_objetivo': '🎯'
  };
  return iconos[tipo] || '📢';
}

/** Color por prioridad de alerta */
getColorPrioridad(prioridad: string): string {
  const colores: { [key: string]: string } = {
    'alta': '#dc3545',
    'media': '#ffc107',
    'baja': '#17a2b8'
  };
  return colores[prioridad] || '#6c757d';
}

/** Formatear fecha y hora juntas */
formatearFechaHora(fecha: string | Date | null): string {
  if (!fecha) return '-';
  const d = new Date(fecha);
  return d.toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/** Marcar alerta como atendida/descartada */
atenderAlerta(alerta: AlertaProgresion, accion: string): void {
  this.cargando = true;

  this.progresoService.actualizarEstadoAlerta(alerta.id_alerta, accion).subscribe({
    next: () => {
      this.exito = '✓ Alerta actualizada correctamente';
      alerta.estado = 'atendida';
      setTimeout(() => this.exito = '', 4000);
      this.cargarAlertas();
      this.cargando = false;
    },
    error: () => {
      this.error = 'Error al actualizar la alerta';
      this.cargando = false;
    }
  });
}

/** Calcula cuántos días han pasado desde una fecha dada */
calcularDiasDesde(fecha: Date | string | null): number {
  if (!fecha) return 0;
  const f = new Date(fecha).getTime();
  const hoy = new Date().getTime();
  const diff = hoy - f;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Texto bonito para calidad técnica */
getTextoCalidadTecnica(valor: string): string {
  const mapa: { [key: string]: string } = {
    'excelente': '⭐⭐⭐⭐⭐ Excelente',
    'buena': '⭐⭐⭐⭐ Buena',
    'regular': '⭐⭐⭐ Regular',
    'mala': '⭐⭐ Mala'
  };
  return mapa[valor] || valor;
}
verHistorialDeRutina(rutina: HistorialRutina): void {
  this.rutinaSeleccionada = rutina;
  this.tabActiva = 'ejercicios'; // 👈 Cambiar de tab automáticamente

  // Cargar sus ejercicios
  this.cargarEjerciciosDeRutina();

  // (Opcional) pequeño delay para que el DOM tenga tiempo de cambiar
  setTimeout(() => {
    const elemento = document.getElementById('seccion-ejercicios');
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth' });
    }
  }, 150);
}



}

