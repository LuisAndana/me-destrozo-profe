// progreso-cliente.component.ts - CÓDIGO COMPLETO
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
  ultima_sesion: string | null;
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
  
  // ✅ TABS - CAMBIAR A 'alertas' POR DEFECTO
  tabActiva: 'dashboard' | 'historial' | 'alertas' | 'objetivos' | 'ejercicios' = 'alertas';
  
  // Historial de rutinas
  historialRutinas: HistorialRutina[] = [];
  rutinaSeleccionada: HistorialRutina | null = null;
  
  // ✅ ALERTAS - CAMBIAR A 'pendiente' POR DEFECTO
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
  
  // ✅ PROPIEDADES PARA CONTROL DE FECHAS
  fechaMaximaPermitida: string = new Date().toISOString().slice(0, 10);
  fechaMinimaPermitida: string = '2020-01-01';
  
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

  /**
   * ✅ NGOINIT MEJORADO - Generar alertas automáticamente y cargar todo
   */
  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.idCliente = +params['id'];

      if (this.idCliente) {
        console.log('🚀 Inicializando componente para cliente:', this.idCliente);
        
        this.cargando = true;
        
        // ✅ Primero generar alertas, luego cargar todos los datos
        this.progresoService.generarAlertasAutomaticas(this.idCliente).subscribe({
          next: () => {
            console.log('✅ Alertas generadas automáticamente para cliente', this.idCliente);
            // Ahora cargar todos los datos (incluyendo alertas actualizadas)
            this.cargarTodosDatos();
          },
          error: (err) => {
            console.error('❌ Error al generar alertas:', err);
            // De todas formas cargar los datos aunque falle la generación
            this.cargarTodosDatos();
          }
        });
      }
    });
  }

  /**
   * ✅ CARGAR TODOS LOS DATOS
   */
  cargarTodosDatos(): void {
    console.log('📊 Cargando todos los datos del cliente...');
    
    this.cargarDashboard();
    this.cargarHistorialRutinas();
    this.cargarAlertas();          // ✅ CARGAR ALERTAS AQUÍ
    this.cargarObjetivos();
    
    this.cargando = false;
  }

  /**
   * Carga el dashboard resumido
   */
  cargarDashboard(): void {
    console.log('📈 Cargando dashboard...');
    
    this.progresoService.obtenerDashboardCliente(this.idCliente).subscribe({
      next: (data) => {
        console.log('✅ Dashboard cargado');
        this.dashboard = data;
        this.nombreCliente = data.nombre_cliente;
      },
      error: (err) => {
        console.error('❌ Error al cargar dashboard:', err);
        this.error = 'Error al cargar el dashboard';
      }
    });
  }

  /**
   * Carga el historial de rutinas
   */
  cargarHistorialRutinas(): void {
    console.log('📋 Cargando historial de rutinas...');
    
    this.progresoService.obtenerHistorialCliente(this.idCliente).subscribe({
      next: (rutinas) => {
        console.log('✅ Historial cargado:', rutinas.length, 'rutinas');
        this.historialRutinas = rutinas;
        
        // Seleccionar la rutina activa o la más reciente
        const rutinaActiva = rutinas.find(r => r.estado === 'activa');
        this.rutinaSeleccionada = rutinaActiva || rutinas[0] || null;
        
        if (this.rutinaSeleccionada) {
          this.cargarEjerciciosDeRutina();
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar historial:', err);
        this.error = 'Error al cargar el historial de rutinas';
      }
    });
  }

  /**
   * ✅ Carga ejercicios con progreso de la rutina seleccionada
   */
  cargarEjerciciosDeRutina(): void {
    if (!this.rutinaSeleccionada) {
      console.warn('⚠️ No hay rutina seleccionada');
      this.ejercicios = [];
      return;
    }

    console.log('💪 Cargando ejercicios de la rutina:', this.rutinaSeleccionada.id_historial);
    
    this.progresoService.obtenerEjerciciosConProgreso(
      this.rutinaSeleccionada.id_historial,
      this.idCliente
    ).subscribe({
      next: (ejercicios) => {
        console.log('✅ Ejercicios cargados:', ejercicios.length, 'ejercicios');

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
      },
      error: (err) => {
        console.error('❌ Error al cargar ejercicios:', err);
        this.error = 'Error al cargar los ejercicios de la rutina';
        this.ejercicios = [];
      }
    });
  }

  /**
   * ✅ CARGAR ALERTAS - AHORA SE EJECUTA AUTOMÁTICAMENTE
   */
  cargarAlertas(): void {
    console.log('📥 Cargando alertas del cliente:', this.idCliente);
    
    this.progresoService.obtenerAlertasCliente(this.idCliente).subscribe({
      next: (alertas) => {
        console.log('✅ Alertas cargadas:', alertas.length, 'alertas');
        this.alertas = alertas;
        
        // ✅ FILTRAR AUTOMÁTICAMENTE A 'PENDIENTE'
        this.filtroAlerta = 'pendiente';
        this.filtrarAlertas();
        
        console.log('⏳ Alertas PENDIENTES mostradas:', this.alertasFiltradas.length);
      },
      error: (err) => {
        console.error('❌ Error al cargar alertas:', err);
        this.error = 'Error al cargar las alertas';
        this.alertas = [];
        this.alertasFiltradas = [];
      }
    });
  }

  /**
   * Carga los objetivos del cliente
   */
  cargarObjetivos(): void {
    console.log('🎯 Cargando objetivos...');
    
    this.progresoService.obtenerObjetivosCliente(this.idCliente).subscribe({
      next: (objetivos) => {
        console.log('✅ Objetivos cargados:', objetivos.length, 'objetivos');
        this.objetivos = objetivos;
        this.filtrarObjetivos();
      },
      error: (err) => {
        console.error('❌ Error al cargar objetivos:', err);
        this.error = 'Error al cargar los objetivos';
      }
    });
  }

  /**
   * Cambia de tab
   */
  cambiarTab(tab: 'dashboard' | 'historial' | 'alertas' | 'objetivos' | 'ejercicios'): void {
    console.log('📑 Cambiando a tab:', tab);
    this.tabActiva = tab;
    
    // Limpiar mensajes al cambiar de tab
    this.error = '';
    this.exito = '';
    
    // Recargar datos del tab si es necesario
    if (tab === 'alertas') {
      this.cargarAlertas();
    } else if (tab === 'objetivos') {
      this.cargarObjetivos();
    }
  }

  /**
   * Selecciona una rutina del historial
   */
  seleccionarRutina(rutina: HistorialRutina): void {
    console.log('📌 Rutina seleccionada:', rutina.nombre_rutina);
    this.rutinaSeleccionada = rutina;
    this.cargarEjerciciosDeRutina();
  }

  /**
   * ✅ FILTRAR ALERTAS - AHORA SE EJECUTA AUTOMÁTICAMENTE
   */
  filtrarAlertas(): void {
    console.log('🔍 Filtrando alertas - Filtro:', this.filtroAlerta);
    
    if (!this.alertas || this.alertas.length === 0) {
      console.warn('⚠️ No hay alertas para filtrar');
      this.alertasFiltradas = [];
      return;
    }

    if (this.filtroAlerta === 'todas') {
      this.alertasFiltradas = [...this.alertas];
      console.log('✅ Mostrando TODAS las alertas:', this.alertasFiltradas.length);
    } else {
      this.alertasFiltradas = this.alertas.filter(a => a.estado === this.filtroAlerta);
      console.log(`✅ Mostrando alertas '${this.filtroAlerta}':`, this.alertasFiltradas.length);
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
    console.log('💪 Ejercicio seleccionado:', ejercicio.nombre);
    this.ejercicioSeleccionado = ejercicio;
    this.cargarProgresoEjercicio(ejercicio.id_ejercicio);
  }

  /**
   * Carga el progreso detallado de un ejercicio
   */
  cargarProgresoEjercicio(idEjercicio: number): void {
    this.cargando = true;
    console.log('📊 Cargando progreso del ejercicio:', idEjercicio);
    
    this.progresoService.obtenerProgresoEjercicio(idEjercicio, this.idCliente).subscribe({
      next: (progreso) => {
        console.log('✅ Progreso cargado:', progreso.length, 'sesiones');
        this.progresoEjercicio = progreso;
        this.cargando = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar progreso del ejercicio:', err);
        this.error = 'Error al cargar el progreso del ejercicio';
        this.cargando = false;
      }
    });
  }

  /**
   * ✅ ABRE MODAL PARA REGISTRAR PROGRESO - VERSIÓN ACTUALIZADA CON SELECTOR DE FECHA
   */
  abrirModalRegistroProgreso(ejercicio: EjercicioProgreso): void {
    if (!this.rutinaSeleccionada) {
      this.error = 'No hay rutina activa seleccionada';
      return;
    }

    console.log('📝 Abriendo modal para registrar progreso de:', ejercicio.nombre);

    // ✅ Establecer el ejercicio seleccionado
    this.ejercicioSeleccionado = ejercicio;

    // ✅ Calcular fecha mínima (primer día de la rutina)
    let fechaMinima = this.fechaMinimaPermitida;
    if (this.rutinaSeleccionada.fecha_inicio) {
      const fechaInicioRutina = new Date(this.rutinaSeleccionada.fecha_inicio);
      fechaMinima = fechaInicioRutina.toISOString().slice(0, 10);
    }
    
    this.fechaMinimaPermitida = fechaMinima;
    this.fechaMaximaPermitida = new Date().toISOString().slice(0, 10); // Hoy es el máximo

    this.registroForm = {
      id_historial: this.rutinaSeleccionada.id_historial,
      id_ejercicio: ejercicio.id_ejercicio,
      fecha_sesion: new Date().toISOString().slice(0, 16),  // ✅ Por defecto hoy en formato datetime-local
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
   * ✅ REGISTRA PROGRESO CON VALIDACIÓN DE FECHA
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

    // ✅ VALIDAR FECHA - NO PERMITE FUTURO
    if (!this.validarFecha()) {
      return;
    }

    if (!this.registroForm.peso_kg || this.registroForm.peso_kg <= 0) {
      this.error = 'Ingresa un peso válido';
      return;
    }

    this.cargando = true;
    this.error = '';

    console.log('💾 Registrando progreso...');
    console.log('📅 Fecha seleccionada:', this.registroForm.fecha_sesion);

    this.progresoService.registrarSesion(
      this.ejercicioSeleccionado.id_ejercicio,
      this.idCliente,
      this.rutinaSeleccionada.id_historial,
      this.registroForm
    ).subscribe({
      next: () => {
        console.log('✅ Sesión registrada exitosamente');
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
   * ✅ GENERAR ALERTAS MANUALMENTE (ahora también disponible como botón)
   */
  generarAlertasManual(): void {
    console.log('🔄 Generando alertas manualmente...');
    this.cargando = true;
    this.error = '';
    
    this.progresoService.generarAlertasAutomaticas(this.idCliente).subscribe({
      next: (response) => {
        console.log('✅ Alertas generadas manualmente:', response);
        this.exito = `✅ ${response.mensaje || 'Alertas generadas correctamente'}`;
        
        // Recargar alertas después de generarlas
        setTimeout(() => this.cargarAlertas(), 500);
        
        setTimeout(() => this.exito = '', 5000);
        this.cargando = false;
      },
      error: (err) => {
        console.error('❌ Error al generar alertas:', err);
        this.error = 'Error al generar alertas. Intenta de nuevo.';
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

  /**
   * ✅ ATENDER ALERTA (Marcar como resuelta/descartada)
   */
  atenderAlerta(alerta: AlertaProgresion, accion: string): void {
    console.log('✓ Atendiendo alerta:', alerta.id_alerta, 'Acción:', accion);
    this.cargando = true;

    this.progresoService.actualizarEstadoAlerta(alerta.id_alerta, accion).subscribe({
      next: () => {
        console.log('✅ Alerta actualizada correctamente');
        this.exito = '✓ Alerta marcada como ' + accion;
        alerta.estado = 'atendida';
        setTimeout(() => this.exito = '', 4000);
        this.cargarAlertas();
        this.cargando = false;
      },
      error: (err) => {
        console.error('❌ Error al actualizar la alerta:', err);
        this.error = 'Error al actualizar la alerta';
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
   * Formatea fecha y hora juntas
   */
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
   * ✅ ACTUALIZADO: Obtiene color según la prioridad de la alerta
   */
  getColorPrioridad(prioridad: string): string {
    const colores: { [key: string]: string } = {
      'alta': '#dc3545',      // Rojo
      'media': '#ffc107',     // Amarillo
      'baja': '#17a2b8'       // Azul
    };
    return colores[prioridad?.toLowerCase()] || '#6c757d';
  }

  /**
   * ✅ ACTUALIZADO: Obtiene icono según el tipo de alerta
   */
  getIconoAlerta(tipo: string): string {
    const iconos: { [key: string]: string } = {
      'progresion': '📈',
      'estancamiento': '⚠️',
      'progresion_retrasada': '⏳',
      'rutina_expira': '⏰',
      'sin_rutina': '📋',
      'record_personal': '🏆',
      'nuevo_objetivo': '🎯',
      'meseta_peso': '📊',
      'aumento_peso': '📈',
      'bajo_cumplimiento': '⚠️',
      'lesion_potencial': '🚑',
      'sin_progreso': '🔴'
    };
    return iconos[tipo] || '📢';
  }

  /**
   * Obtiene emoji según el tipo de alerta (compatibilidad)
   */
  getEmojiAlerta(tipo: string): string {
    return this.getIconoAlerta(tipo);
  }

  /**
   * Obtiene color según la prioridad de la alerta (compatibilidad)
   */
  getColorAlerta(prioridad: string): string {
    return this.getColorPrioridad(prioridad);
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

  /**
   * Calcula cuántos días han pasado desde una fecha dada
   */
  calcularDiasDesde(fecha: Date | string | null): number {
    if (!fecha) return 0;
    const f = new Date(fecha).getTime();
    const hoy = new Date().getTime();
    const diff = hoy - f;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Texto bonito para calidad técnica
   */
  getTextoCalidadTecnica(valor: string): string {
    const mapa: { [key: string]: string } = {
      'excelente': '⭐⭐⭐⭐⭐ Excelente',
      'buena': '⭐⭐⭐⭐ Buena',
      'regular': '⭐⭐⭐ Regular',
      'mala': '⭐⭐ Mala'
    };
    return mapa[valor] || valor;
  }

  /**
   * Ver historial de una rutina específica
   */
  verHistorialDeRutina(rutina: HistorialRutina): void {
    console.log('📊 Ver historial de:', rutina.nombre_rutina);
    this.rutinaSeleccionada = rutina;
    this.tabActiva = 'ejercicios';

    // Cargar sus ejercicios
    this.cargarEjerciciosDeRutina();

    // Scroll suave
    setTimeout(() => {
      const elemento = document.getElementById('seccion-ejercicios');
      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  }

  // ============================================================
  // ✅ NUEVOS MÉTODOS HELPER PARA MANEJO DE FECHAS
  // ============================================================

  /**
   * ✅ Valida que la fecha no sea en el futuro
   */
  validarFecha(): boolean {
    const fechaSeleccionada = new Date(this.registroForm.fecha_sesion);
    const hoy = new Date();
    
    // Comparar solo la fecha (sin hora)
    const fechaSeleccionadaStr = fechaSeleccionada.toISOString().slice(0, 10);
    const hoyStr = hoy.toISOString().slice(0, 10);
    
    if (fechaSeleccionadaStr > hoyStr) {
      this.error = '❌ No puedes registrar una sesión en el futuro';
      return false;
    }
    
    return true;
  }

  /**
   * ✅ Convierte fecha a formato legible
   */
  obtenerFechaLegible(fechaStr: string): string {
    try {
      const fecha = new Date(fechaStr);
      return fecha.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return fechaStr;
    }
  }

  /**
   * ✅ Calcula cuántos días atrás fue (desde hoy)
   */
  diasAtrasDesdeHoy(fechaStr: string): number {
    const fechaSeleccionada = new Date(fechaStr);
    const hoy = new Date();
    
    // Resetear horas para comparación correcta
    fechaSeleccionada.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);
    
    const diferencia = hoy.getTime() - fechaSeleccionada.getTime();
    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  }

  /**
   * ✅ Retorna texto amigable para la fecha relativa
   * Ejemplos: "(Hoy)", "(Ayer)", "(Hace 3 días)", "(Hace 2 semanas)"
   */
  obtenerTextoFechaRelativa(fechaStr: string): string {
    const dias = this.diasAtrasDesdeHoy(fechaStr);
    
    if (dias === 0) return '(Hoy)';
    if (dias === 1) return '(Ayer)';
    if (dias < 7) return `(Hace ${dias} días)`;
    if (dias < 30) return `(Hace ${Math.floor(dias / 7)} semanas)`;
    
    return `(Hace ${Math.floor(dias / 30)} meses)`;
  }
}