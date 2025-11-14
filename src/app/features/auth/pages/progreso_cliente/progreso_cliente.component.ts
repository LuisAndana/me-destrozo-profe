import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProgresoService, HistorialRutina, ProgresoEjercicio, AlertaProgresion, ObjetivoCliente, DashboardCliente } from '../../../../core/services/progreso.service';

interface EjercicioConProgreso {
  id_ejercicio: number;
  nombre: string;
  grupo_muscular: string;
  total_sesiones: number;
  peso_inicial: number | null;
  peso_actual: number | null;
  peso_maximo: number | null;
  progreso_total: number | null;
  porcentaje_mejora: number | null;
  ultima_sesion: Date | null;
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
  ejercicios: EjercicioConProgreso[] = [];
  ejercicioSeleccionado: EjercicioConProgreso | null = null;
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
    // Obtener ID del cliente desde la ruta
    this.route.params.subscribe(params => {
      this.idCliente = +params['id'];
      if (this.idCliente) {
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
   * Carga ejercicios con progreso de la rutina seleccionada
   * NOTA: Este método necesita un endpoint específico en el backend
   * Por ahora, carga ejercicios de ejemplo basados en la rutina
   */
  cargarEjerciciosDeRutina(): void {
    if (!this.rutinaSeleccionada) {
      this.ejercicios = [];
      return;
    }

    // TODO: Implementar endpoint específico en backend:
    // GET /api/progresion/historial/{id_historial}/ejercicios
    // Por ahora usamos datos de ejemplo
    
    // Simulamos la carga de ejercicios
    // En producción, esto debería llamar a un endpoint del backend
    console.log('Cargando ejercicios de la rutina:', this.rutinaSeleccionada.id_historial);
    
    // Ejemplo de cómo se vería la implementación real:
    /*
    this.progresoService.obtenerEjerciciosConProgreso(
      this.rutinaSeleccionada.id_historial,
      this.idCliente
    ).subscribe({
      next: (ejercicios) => {
        this.ejercicios = ejercicios;
      },
      error: (err) => {
        console.error('Error al cargar ejercicios:', err);
      }
    });
    */
    
    // Datos de ejemplo para testing
    this.ejercicios = [];
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
   * Cambia la tab activa
   */
  cambiarTab(tab: 'dashboard' | 'historial' | 'alertas' | 'objetivos' | 'ejercicios'): void {
    this.tabActiva = tab;
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
   * Selecciona un ejercicio para ver su progreso
   */
  seleccionarEjercicio(ejercicio: EjercicioConProgreso): void {
    this.ejercicioSeleccionado = ejercicio;
    this.cargarProgresoEjercicio(ejercicio.id_ejercicio);
    
    // Cambiar a la tab de ejercicios si no está activa
    if (this.tabActiva !== 'ejercicios') {
      this.tabActiva = 'ejercicios';
    }
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
  abrirModalRegistroProgreso(ejercicio: EjercicioConProgreso): void {
    if (!this.rutinaSeleccionada) {
      this.error = 'No hay rutina activa seleccionada';
      return;
    }

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
   * Registra progreso de ejercicio
   */
  registrarProgreso(): void {
    if (!this.registroForm.peso_kg || this.registroForm.peso_kg <= 0) {
      this.error = 'Ingresa un peso válido';
      return;
    }

    this.cargando = true;
    this.error = '';

    this.progresoService.registrarProgreso(this.registroForm).subscribe({
      next: (response) => {
        this.exito = '✓ Progreso registrado exitosamente';
        this.mostrarModalRegistro = false;
        this.cargando = false;
        
        // Recargar datos
        this.cargarDashboard();
        if (this.ejercicioSeleccionado) {
          this.cargarProgresoEjercicio(this.ejercicioSeleccionado.id_ejercicio);
        }
        
        // Si fue record personal, mostrar mensaje especial
        if (response.record_personal) {
          this.exito = '🏆 ¡Nuevo Record Personal! Progreso registrado exitosamente';
        }
        
        setTimeout(() => this.exito = '', 5000);
      },
      error: (err) => {
        console.error('Error al registrar progreso:', err);
        this.error = 'Error al registrar el progreso. Intenta de nuevo.';
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
        this.exito = `✓ Análisis completado. ${response.alertas_generadas} alertas generadas.`;
        this.cargando = false;
        this.cargarAlertas();
        this.cargarDashboard();
        setTimeout(() => this.exito = '', 5000);
      },
      error: (err) => {
        console.error('Error al analizar progresión:', err);
        this.error = 'Error al analizar la progresión';
        this.cargando = false;
      }
    });
  }

  /**
   * Marca una alerta como atendida
   */
  atenderAlerta(alerta: AlertaProgresion, accion: string): void {
    const idEntrenador = 1; // TODO: Obtener del servicio de auth
    
    this.progresoService.atenderAlerta(alerta.id_alerta, idEntrenador, accion).subscribe({
      next: () => {
        this.exito = '✓ Alerta atendida';
        this.cargarAlertas();
        this.cargarDashboard();
        setTimeout(() => this.exito = '', 3000);
      },
      error: (err) => {
        console.error('Error al atender alerta:', err);
        this.error = 'Error al atender la alerta';
      }
    });
  }

  /**
   * Obtiene el color según la prioridad de la alerta
   */
  getColorPrioridad(prioridad: string): string {
    const colores: { [key: string]: string } = {
      'baja': '#51cf66',
      'media': '#ffa500',
      'alta': '#ff6b6b',
      'critica': '#ff0000'
    };
    return colores[prioridad] || '#a0a0a0';
  }

  /**
   * Obtiene el icono según el tipo de alerta
   */
  getIconoAlerta(tipo: string): string {
    const iconos: { [key: string]: string } = {
      'aumentar_peso': '⬆️',
      'aumentar_reps': '🔄',
      'reducir_descanso': '⏱️',
      'cambiar_ejercicio': '🔀',
      'meseta_detectada': '📊',
      'regresion_detectada': '📉',
      'objetivo_alcanzado': '🎯',
      'record_personal': '🏆'
    };
    return iconos[tipo] || '⚠️';
  }

  /**
   * Obtiene el color según el estado del objetivo
   */
  getColorObjetivo(estado: string): string {
    const colores: { [key: string]: string } = {
      'pendiente': '#74c0fc',
      'en_progreso': '#ffa500',
      'alcanzado': '#51cf66',
      'no_alcanzado': '#ff6b6b',
      'cancelado': '#a0a0a0'
    };
    return colores[estado] || '#a0a0a0';
  }

  /**
   * Formatea un número con decimales
   */
  formatearNumero(valor: number | null | undefined, decimales: number = 1): string {
    if (valor === null || valor === undefined) return '-';
    return valor.toFixed(decimales);
  }

  /**
   * Formatea una fecha
   */
  formatearFecha(fecha: Date | string | null): string {
    if (!fecha) return '-';
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  /**
   * Formatea una fecha con hora
   */
  formatearFechaHora(fecha: Date | string | null): string {
    if (!fecha) return '-';
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return date.toLocaleString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Calcula días desde una fecha
   */
  calcularDiasDesde(fecha: Date | string | null): number {
    if (!fecha) return 0;
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    const hoy = new Date();
    const diff = hoy.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Obtiene el texto del estado de ánimo
   */
  getTextoEstadoAnimo(estado: string | null): string {
    const textos: { [key: string]: string } = {
      'excelente': '😁 Excelente',
      'bueno': '😊 Bueno',
      'regular': '😐 Regular',
      'malo': '😞 Malo'
    };
    return estado ? textos[estado] || estado : '-';
  }

  /**
   * Obtiene el texto de calidad técnica
   */
  getTextoCalidadTecnica(calidad: string): string {
    const textos: { [key: string]: string } = {
      'excelente': '⭐⭐⭐⭐⭐',
      'buena': '⭐⭐⭐⭐',
      'regular': '⭐⭐⭐',
      'mala': '⭐⭐'
    };
    return textos[calidad] || calidad;
  }
}