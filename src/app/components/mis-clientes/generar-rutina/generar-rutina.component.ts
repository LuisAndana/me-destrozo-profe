  import { Component, OnInit } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { FormsModule } from '@angular/forms';
  import { RutinaService, Alumno, Ejercicio, DiaRutina, RutinaGenerada } from '../../../core/services/rutina.service';
  import { GuardarRutinaModalComponent } from '../guardar-clientes/guardar-rutina.modal.component';
  import { EditarRutinaModalComponent } from './editar-rutina/editar-rutina.modal.component';
  import jsPDF from 'jspdf';

  // Interfaz para parámetros estructurados
  interface ParametrosRutina {
    objetivo: string;
    lugar: string;
    equipamiento: string[];
    tiempo_minutos: number;
    experiencia: string;
  }

  // Opciones predefinidas
  interface OpcionEquipamiento {
    value: string;
    label: string;
    icon: string;
  }

  @Component({
    selector: 'app-generar-rutina',
    standalone: true,
    imports: [
      CommonModule,
      FormsModule,
      GuardarRutinaModalComponent,
      EditarRutinaModalComponent
    ],
    templateUrl: './generar-rutina.component.html',
    styleUrls: ['./generar-rutina.component.css']
  })
  export class GenerarRutinaComponent implements OnInit {
    // Datos
    alumnos: Alumno[] = [];
    alumnoSeleccionado: Alumno | null = null;
    ejerciciosDisponibles: Ejercicio[] = [];
    
    // Parámetros estructurados
    parametros: ParametrosRutina = {
      objetivo: '',
      lugar: 'gimnasio',
      equipamiento: [],
      tiempo_minutos: 45,
      experiencia: 'intermedio'
    };

    // Opciones predefinidas de equipamiento
    opcionesEquipamiento: OpcionEquipamiento[] = [
      { value: 'mancuernas', label: 'Mancuernas', icon: '🏋️' },
      { value: 'barra', label: 'Barra', icon: '⚡' },
      { value: 'banco', label: 'Banco', icon: '🪑' },
      { value: 'maquinas', label: 'Máquinas', icon: '⚙️' },
      { value: 'bandas', label: 'Bandas elásticas', icon: '🎸' },
      { value: 'kettlebell', label: 'Kettlebells', icon: '⚫' },
      { value: 'polea', label: 'Poleas/Cables', icon: '🔗' },
      { value: 'trx', label: 'TRX/Suspensión', icon: '🎪' },
      { value: 'peso_corporal', label: 'Peso corporal', icon: '💪' },
      { value: 'cardio', label: 'Equipo cardio', icon: '🏃' }
    ];

    // Opciones de tiempo
    opcionesTiempo: number[] = [30, 45, 60, 75, 90];
    
    // Formulario legacy (mantener por compatibilidad)
    diasPorSemana: number = 4;
    nivel: 'principiante' | 'intermedio' | 'avanzado' = 'intermedio';
    grupoMuscularFoco: string = '';  // Vacío para forzar selección obligatoria
    
    // NUEVO: Vigencia de rutinas
    duracionMeses: number = 1;  // Duración por defecto: 1 mes
    opcionesDuracion: number[] = [1, 2, 3, 4, 5, 6, 9, 12];  // Opciones de duración en meses
    activarVigenciaInmediata: boolean = true;  // Activar vigencia al crear
    
    // Estados
    cargandoAlumnos: boolean = false;
    cargandoRutina: boolean = false;
    rutinaGenerada: RutinaGenerada | null = null;
    mensajeError: string = '';
    mensajeExito: string = '';
    
    // Para mostrar ejercicios con estructura V3
    diaSeleccionado: number = 0;

    // Modales
    mostrarModalGuardar: boolean = false;
    mostrarModalEditar: boolean = false;
    rutinaEditando: RutinaGenerada | null = null;

    constructor(private rutinaService: RutinaService) {}

    ngOnInit(): void {
      this.cargarAlumnos();
      this.cargarEjercicios();
      this.suscribirseAlAlumnoSeleccionado();
    }

    /**
     * Toggle equipamiento en array
     */
    toggleEquipamiento(valor: string): void {
      const index = this.parametros.equipamiento.indexOf(valor);
      if (index > -1) {
        this.parametros.equipamiento.splice(index, 1);
      } else {
        this.parametros.equipamiento.push(valor);
      }
    }

    /**
     * Obtener nombre legible del objetivo
     */
    getNombreObjetivo(objetivo: string): string {
      const mapa: { [key: string]: string } = {
        'hipertrofia': 'Ganar masa muscular',
        'fuerza': 'Aumentar fuerza',
        'resistencia': 'Mejorar resistencia',
        'perdida_grasa': 'Pérdida de grasa',
        'tonificacion': 'Tonificación general',
        'gluteos': 'Enfoque en glúteos',
        'funcional': 'Entrenamiento funcional'
      };
      return mapa[objetivo] || objetivo;
    }

    /**
     * NUEVO: Obtener texto descriptivo de la duración
     */
    getDescripcionDuracion(meses: number): string {
      if (meses === 1) return '1 mes';
      if (meses < 6) return `${meses} meses (Corto plazo)`;
      if (meses < 9) return `${meses} meses (Mediano plazo)`;
      return `${meses} meses (Largo plazo)`;
    }

    /**
     * NUEVO: Calcular fecha de vencimiento estimada
     */
    getFechaVencimientoEstimada(): string {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() + this.duracionMeses);
      return fecha.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }

    /**
     * Cargar lista de alumnos
     */
    cargarAlumnos(): void {
      this.cargandoAlumnos = true;
      this.mensajeError = '';
      
      this.rutinaService.obtenerAlumnos().subscribe({
        next: (alumnos: Alumno[]) => {
          this.alumnos = alumnos;
          this.cargandoAlumnos = false;
          
          if (alumnos.length === 0) {
            this.mensajeError = 'No hay alumnos disponibles';
          }
        },
        error: (error: any) => {
          console.error('Error al cargar alumnos:', error);
          this.mensajeError = 'Error al cargar los alumnos. Verifica tu conexión.';
          this.cargandoAlumnos = false;
        }
      });
    }

    /**
     * Cargar ejercicios disponibles de la BD
     */
    cargarEjercicios(): void {
      this.rutinaService.obtenerEjerciciosDb().subscribe({
        next: (ejercicios: Ejercicio[]) => {
          this.ejerciciosDisponibles = ejercicios;
          console.log(`✅ Ejercicios cargados: ${ejercicios.length}`);
        },
        
      });
    }

    /**
     * Suscribirse a cambios del alumno seleccionado
     */
    private suscribirseAlAlumnoSeleccionado(): void {
      this.rutinaService.alumnoSeleccionado$.subscribe((alumno: Alumno | null) => {
        this.alumnoSeleccionado = alumno;
      });
    }

    /**
     * Seleccionar un alumno
     */
    seleccionarAlumno(alumno: Alumno): void {
      this.rutinaService.seleccionarAlumno(alumno);
      this.alumnoSeleccionado = alumno;
      this.mensajeError = '';
      this.rutinaGenerada = null;
    }

    /**
     * Obtener nombre completo del alumno
     */
    getNombreAlumno(alumno: Alumno): string {
      return `${alumno.nombre} ${alumno.apellido}`;
    }

    /**
     * Obtener datos formateados del alumno seleccionado
     */
    getDatosAlumnoFormateados(): any {
      if (!this.alumnoSeleccionado) return null;
      return this.rutinaService.prepararDatosAlumno(this.alumnoSeleccionado);
    }

    /**
     * Validar formulario con parámetros estructurados
     */
    formularioValido(): boolean {
      return (
        this.alumnoSeleccionado !== null &&
        this.parametros.objetivo.length > 0 &&
        this.parametros.lugar.length > 0 &&
        this.parametros.tiempo_minutos > 0 &&
        this.parametros.experiencia.length > 0 &&
        this.diasPorSemana > 0 &&
        this.grupoMuscularFoco.length > 0 &&  // Ahora es obligatorio
        this.duracionMeses >= 1 && this.duracionMeses <= 12  // NUEVO: Validar duración
      );
    }

    /**
     * Construir texto de objetivos desde parámetros estructurados
     */
    private construirObjetivosTexto(): string {
      const partes: string[] = [];
      
      // Objetivo principal
      partes.push(this.getNombreObjetivo(this.parametros.objetivo));
      
      // Énfasis en grupo muscular (SIEMPRE incluido ahora)
      if (this.grupoMuscularFoco && this.grupoMuscularFoco !== 'general') {
        partes.push(`CON ÉNFASIS EN ${this.grupoMuscularFoco.toUpperCase()}`);
      }
      
      // Contexto de lugar y equipo
      if (this.parametros.lugar === 'casa' && this.parametros.equipamiento.length === 0) {
        partes.push('entrenar en casa sin equipo (peso corporal)');
      } else if (this.parametros.lugar === 'casa') {
        partes.push(`entrenar en casa con ${this.parametros.equipamiento.slice(0, 3).join(', ')}`);
      } else if (this.parametros.lugar === 'parque') {
        partes.push('entrenar en exterior/parque');
      } else {
        if (this.parametros.equipamiento.length > 0) {
          partes.push(`usar ${this.parametros.equipamiento.slice(0, 3).join(', ')}`);
        }
      }
      
      // Tiempo
      partes.push(`sesiones de ${this.parametros.tiempo_minutos} minutos`);
      
      // Nivel
      partes.push(`nivel ${this.parametros.experiencia}`);

      return partes.join(', ');
    }

    /**
     * Generar nombre corto para la rutina (máximo 100 caracteres para BD)
     */
    private generarNombreRutina(): string {
      const objetivo = this.getNombreObjetivo(this.parametros.objetivo);
      const nivel = this.parametros.experiencia.charAt(0).toUpperCase() + this.parametros.experiencia.slice(1);
      const dias = this.diasPorSemana;
      
      // Incluir grupo muscular si no es "general"
      let nombreBase = '';
      if (this.grupoMuscularFoco && this.grupoMuscularFoco !== 'general') {
        // Formato: "Hipertrofia GLÚTEOS - 4 días - Intermedio"
        nombreBase = `${objetivo} ${this.grupoMuscularFoco.toUpperCase()} - ${dias}d - ${nivel}`;
      } else {
        // Formato: "Hipertrofia - 4 días - Intermedio"
        nombreBase = `${objetivo} - ${dias}d - ${nivel}`;
      }
      
      // Limitar a 95 caracteres para dejar margen
      return nombreBase.length > 95 ? nombreBase.substring(0, 92) + '...' : nombreBase;
    }

    /**
     * Generar rutina con IA - VERSIÓN MEJORADA CON VIGENCIA
     */
    generarRutina(): void {
  if (!this.formularioValido() || !this.alumnoSeleccionado) {
    this.mensajeError = 'Por favor completa todos los campos y selecciona un alumno.';
    return;
  }

  this.cargandoRutina = true;
  this.mensajeError = '';
  this.mensajeExito = '';
  this.rutinaGenerada = null;
  this.diaSeleccionado = 0;

  const objetivosTexto = this.construirObjetivosTexto();

  this.rutinaService.generarRutinaIA(
    this.alumnoSeleccionado.id_usuario,
    objetivosTexto,
    this.diasPorSemana,
    this.parametros.experiencia,
    this.duracionMeses,
    this.activarVigenciaInmediata
  ).subscribe({
    next: (resp: any) => {
      this.rutinaGenerada = resp.rutina;

if (this.rutinaGenerada && resp?.rutina?.id_rutina) {
  this.rutinaGenerada.id_rutina = resp.rutina.id_rutina;
}


      this.diaSeleccionado = 0;
      this.mensajeExito = '✓ Rutina generada correctamente';
      this.cargandoRutina = false;

      console.log('🔥 Rutina recibida:', this.rutinaGenerada);
    },

    error: (error: any) => {
      console.error('❌ Error al generar rutina:', error);
      this.mensajeError = error.error?.detail || 'Error al generar la rutina. Intenta de nuevo.';
      this.cargandoRutina = false;
    }
  });
}


    /**
     * Cambiar día seleccionado
     */
    cambiarDia(indice: number): void {
      this.diaSeleccionado = indice;
    }

    /**
     * Obtener día actual
     */
    obtenerDiaActual(): DiaRutina | null {
      if (!this.rutinaGenerada) return null;
      if (!this.rutinaGenerada.dias) return null;
      if (this.diaSeleccionado >= this.rutinaGenerada.dias.length) return null;
      const dia = this.rutinaGenerada.dias[this.diaSeleccionado];
      return dia || null;
    }

    /**
     * Calcular tiempo estimado
     */
    calcularTiempoEstimado(ejercicios: Ejercicio[]): number {
      if (!ejercicios || ejercicios.length === 0) return 0;

      let tiempoTotal = 0;
      
      ejercicios.forEach((ej: Ejercicio) => {
        const series = ej.series || 3;
        const reps = ej.repeticiones || 10;
        const descanso = ej.descanso_segundos || 60;
        
        const tiempoEjercicio = (series * reps * 3) + (descanso * (series - 1));
        tiempoTotal += tiempoEjercicio;
      });

      return Math.ceil(tiempoTotal / 60);
    }

    /**
     * Abrir modal de guardar
     */
    abrirModalGuardar(): void {
      if (!this.rutinaGenerada) {
        this.mensajeError = 'No hay rutina para guardar.';
        return;
      }
      this.mostrarModalGuardar = true;
    }

    /**
     * Guardar rutina desde modal - VERSIÓN CORREGIDA
     */
    guardarRutinaDesdeModal(datos: { nombre: string; descripcion: string }): void {
  if (!this.rutinaGenerada || !this.alumnoSeleccionado) {
    this.mensajeError = 'No hay rutina para guardar.';
    return;
  }

  this.cargandoRutina = true;
  this.mensajeError = '';

  const nombreTruncado = datos.nombre.length > 95 
    ? datos.nombre.substring(0, 92) + '...'
    : datos.nombre;

  const rutinaAGuardar = {
    id_rutina: this.rutinaGenerada.id_rutina,   // 👈 agregado
    id_cliente: this.alumnoSeleccionado.id_usuario,
    nombre: nombreTruncado,
    descripcion: datos.descripcion,
    objetivo: this.rutinaGenerada.objetivo,
    nivel: this.rutinaGenerada.nivel,
    dias_semana: this.rutinaGenerada.dias_semana,
    total_ejercicios: this.rutinaGenerada.total_ejercicios,
    minutos_aproximados: this.rutinaGenerada.minutos_aproximados,
    ejercicios: [],
    dias: this.rutinaGenerada.dias,
    grupo_muscular: this.rutinaGenerada.grupo_muscular,
    fecha_creacion: this.rutinaGenerada.fecha_creacion,
    generada_por: this.rutinaGenerada.generada_por
  };

  this.rutinaService.guardarRutina(rutinaAGuardar).subscribe({
    next: (rutina: any) => {
      let mensaje = '✓ Rutina guardada correctamente en la base de datos';
      
      if (rutina.vigencia && rutina.vigencia.activada) {
        mensaje += ` | ⏳ Válida hasta: ${new Date(rutina.vigencia.fecha_fin).toLocaleDateString('es-ES')}`;
      }
      
      this.mensajeExito = mensaje;
      this.mostrarModalGuardar = false;
      this.cargandoRutina = false;

      setTimeout(() => {
        this.limpiarFormulario();
      }, 2000);
    },
    error: (error: any) => {
      console.error('❌ Error al guardar rutina:', error);
      this.mensajeError = error.error?.detail || 'Error al guardar la rutina.';
      this.cargandoRutina = false;
    }
  });
}


    /**
     * Abrir modal de editar
     */
    abrirModalEditar(): void {
      if (!this.rutinaGenerada) {
        this.mensajeError = 'No hay rutina para editar.';
        return;
      }
      this.rutinaEditando = { ...this.rutinaGenerada };
      this.mostrarModalEditar = true;
    }

    /**
     * Guardar cambios desde modal editar
     */
    guardarCambiosEditar(rutinaEditada: RutinaGenerada): void {
      if (!rutinaEditada) {
        this.mensajeError = 'Error al guardar cambios.';
        return;
      }

      this.rutinaGenerada = rutinaEditada;
      this.mostrarModalEditar = false;
      this.mensajeExito = '✓ Rutina actualizada correctamente (cambios en local)';
      
      console.log('✅ Rutina editada:', this.rutinaGenerada);
    }

    /**
     * Descargar rutina como PDF usando jsPDF - ACTUALIZADO CON VIGENCIA
     */
    descargarRutinaPDF(): void {
      if (!this.rutinaGenerada) {
        this.mensajeError = 'No hay rutina para descargar.';
        return;
      }

      try {
        const doc = new jsPDF();
        let yPos = 20;
        const lineHeight = 7;
        const pageHeight = doc.internal.pageSize.height;
        const marginBottom = 20;

        // Función para agregar nueva página si es necesario
        const checkPageBreak = (neededSpace: number = 10): boolean => {
          if (yPos + neededSpace > pageHeight - marginBottom) {
            doc.addPage();
            yPos = 20;
            return true;
          }
          return false;
        };

        // TÍTULO
        doc.setFontSize(20);
        doc.setTextColor(0, 212, 255);
        doc.text(this.rutinaGenerada.nombre || 'Rutina sin nombre', 20, yPos);
        yPos += 10;

        // DESCRIPCIÓN
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        const splitDescription = doc.splitTextToSize(this.rutinaGenerada.descripcion || '', 170);
        doc.text(splitDescription, 20, yPos);
        yPos += (splitDescription.length * lineHeight) + 5;

        // NUEVO: Información de vigencia
        const vigenciaInfo = (this.rutinaGenerada as any).vigencia;
        if (vigenciaInfo) {
          checkPageBreak(20);
          doc.setFontSize(12);
          doc.setTextColor(255, 165, 0);
          doc.text('⏳ VIGENCIA DE LA RUTINA', 20, yPos);
          yPos += 8;

          doc.setFontSize(10);
          doc.setTextColor(80, 80, 80);
          
          if (vigenciaInfo.activada && vigenciaInfo.fecha_inicio) {
            const fechaInicio = new Date(vigenciaInfo.fecha_inicio).toLocaleDateString('es-ES');
            const fechaFin = new Date(vigenciaInfo.fecha_fin).toLocaleDateString('es-ES');
            doc.text(`• Fecha de inicio: ${fechaInicio}`, 25, yPos);
            yPos += lineHeight;
            doc.text(`• Fecha de vencimiento: ${fechaFin}`, 25, yPos);
            yPos += lineHeight;
            doc.text(`• Duración total: ${vigenciaInfo.duracion_meses} mes(es) (${vigenciaInfo.duracion_dias} días)`, 25, yPos);
            yPos += lineHeight;
            doc.text(`• Días restantes: ${vigenciaInfo.dias_restantes}`, 25, yPos);
            yPos += lineHeight;
            
            // Estado con color
            const estado = vigenciaInfo.estado.toUpperCase();
            if (estado === 'ACTIVA') {
              doc.setTextColor(81, 207, 102);
            } else if (estado === 'POR_VENCER') {
              doc.setTextColor(255, 165, 0);
            } else if (estado === 'VENCIDA') {
              doc.setTextColor(255, 0, 0);
            }
            doc.text(`• Estado: ${estado}`, 25, yPos);
            yPos += lineHeight;
            
            doc.setTextColor(80, 80, 80);
            doc.text(`• Progreso: ${vigenciaInfo.porcentaje_completado}%`, 25, yPos);
            yPos += 10;
          } else {
            doc.text(`• Duración configurada: ${vigenciaInfo.duracion_meses} mes(es)`, 25, yPos);
            yPos += lineHeight;
            doc.text(`• Estado: Pendiente de activación`, 25, yPos);
            yPos += 10;
          }
        }

        // ESTADÍSTICAS
        checkPageBreak(30);
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Estadísticas:', 20, yPos);
        yPos += 8;

        doc.setFontSize(11);
        doc.setTextColor(60, 60, 60);
        doc.text(`• Total de ejercicios: ${this.rutinaGenerada.total_ejercicios || 0}`, 25, yPos);
        yPos += lineHeight;
        doc.text(`• Duración estimada: ${this.rutinaGenerada.minutos_aproximados || 0} minutos`, 25, yPos);
        yPos += lineHeight;
        doc.text(`• Días por semana: ${this.rutinaGenerada.dias_semana || 0}`, 25, yPos);
        yPos += lineHeight;
        doc.text(`• Nivel: ${this.rutinaGenerada.nivel || 'N/A'}`, 25, yPos);
        yPos += lineHeight;
        doc.text(`• Objetivo: ${this.rutinaGenerada.objetivo || 'N/A'}`, 25, yPos);
        yPos += 10;

        // DÍAS Y EJERCICIOS
        if (this.rutinaGenerada.dias && Array.isArray(this.rutinaGenerada.dias)) {
          this.rutinaGenerada.dias.forEach((dia: DiaRutina, diaIdx: number) => {
            checkPageBreak(40);

            // Nombre del día
            doc.setFontSize(16);
            doc.setTextColor(0, 153, 255);
            doc.text(dia.nombre_dia || `Día ${diaIdx + 1}`, 20, yPos);
            yPos += 8;

            // Descripción del día
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            const splitDayDesc = doc.splitTextToSize(dia.descripcion || '', 170);
            doc.text(splitDayDesc, 20, yPos);
            yPos += (splitDayDesc.length * lineHeight);

            // Grupos musculares
            if (dia.grupos_enfoque && Array.isArray(dia.grupos_enfoque) && dia.grupos_enfoque.length > 0) {
              doc.setFontSize(10);
              doc.setTextColor(81, 207, 102);
              doc.text(`🎯 Grupos: ${dia.grupos_enfoque.join(', ')}`, 20, yPos);
              yPos += 8;
            }

            // Ejercicios del día
            if (dia.ejercicios && Array.isArray(dia.ejercicios)) {
              dia.ejercicios.forEach((ejercicio: any, ejIdx: number) => {
                checkPageBreak(25);

                doc.setFontSize(11);
                doc.setTextColor(0, 0, 0);
                doc.text(`${ejIdx + 1}. ${ejercicio.nombre || 'Ejercicio sin nombre'}`, 25, yPos);
                yPos += lineHeight;

                doc.setFontSize(9);
                doc.setTextColor(80, 80, 80);

                // Descripción del ejercicio
                if (ejercicio.descripcion) {
                  const splitEjDesc = doc.splitTextToSize(ejercicio.descripcion, 160);
                  doc.text(splitEjDesc, 30, yPos);
                  yPos += (splitEjDesc.length * 5);
                }

                // Detalles del ejercicio
                const detalles = [];
                if (ejercicio.series) detalles.push(`${ejercicio.series} series`);
                if (ejercicio.repeticiones) detalles.push(`${ejercicio.repeticiones} reps`);
                if (ejercicio.descanso_segundos) detalles.push(`${ejercicio.descanso_segundos}s descanso`);

                if (detalles.length > 0) {
                  doc.text(detalles.join(' • '), 30, yPos);
                  yPos += 6;
                }

                // Tags
                const tags = [
                  ejercicio.grupo_muscular, 
                  ejercicio.dificultad, 
                  ejercicio.tipo
                ].filter(Boolean);
                
                if (tags.length > 0) {
                  doc.setTextColor(0, 153, 255);
                  doc.text(`[${tags.join('] [')}]`, 30, yPos);
                  yPos += 6;
                }

                // Notas
                if (ejercicio.notas) {
                  doc.setTextColor(255, 165, 0);
                  const splitNotas = doc.splitTextToSize(`📝 ${ejercicio.notas}`, 160);
                  doc.text(splitNotas, 30, yPos);
                  yPos += (splitNotas.length * 5);
                }

                yPos += 3;
              });
            }

            yPos += 5;
          });
        }

        // PIE DE PÁGINA
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `FitCoach - Generado el ${new Date().toLocaleDateString('es-ES')} - Página ${i} de ${totalPages}`,
            20,
            pageHeight - 10
          );
        }

        // DESCARGAR
        const nombreArchivo = `${(this.rutinaGenerada.nombre || 'rutina').replace(/\s+/g, '-')}.pdf`;
        doc.save(nombreArchivo);

        this.mensajeExito = '✓ PDF descargado correctamente';
        setTimeout(() => this.mensajeExito = '', 3000);
        
      } catch (error) {
        console.error('Error al generar PDF:', error);
        this.mensajeError = 'Error al generar el PDF. Asegúrate de tener jsPDF instalado: npm install jspdf';
        setTimeout(() => this.mensajeError = '', 5000);
      }
    }

    /**
     * Limpiar formulario
     */
    limpiarFormulario(): void {
      this.parametros = {
        objetivo: '',
        lugar: 'gimnasio',
        equipamiento: [],
        tiempo_minutos: 45,
        experiencia: 'intermedio'
      };
      this.diasPorSemana = 4;
      this.grupoMuscularFoco = 'general';
      this.duracionMeses = 1;  // NUEVO: Resetear duración
      this.activarVigenciaInmediata = true;  // NUEVO: Resetear activación
      this.rutinaGenerada = null;
      this.alumnoSeleccionado = null;
      this.mensajeExito = '';
      this.mensajeError = '';
      this.diaSeleccionado = 0;
    }

    /**
     * Obtener ejercicios recomendados
     */
    obtenerEjerciciosRecomendados(): Ejercicio[] {
      if (this.ejerciciosDisponibles.length === 0) return [];
      
      return this.ejerciciosDisponibles.filter(
        (e: Ejercicio) => e.dificultad?.toLowerCase() === this.parametros.experiencia.toLowerCase()
      );
    }

    /**
     * Obtener grupos musculares únicos
     */
    obtenerGruposMuscularesUnicos(): string[] {
      const grupos = new Set(this.ejerciciosDisponibles.map((e: Ejercicio) => e.grupo_muscular));
      return Array.from(grupos).filter((g: any) => g && g.length > 0);
    }
  }