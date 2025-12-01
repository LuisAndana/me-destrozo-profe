// ✅ COMPONENTE FINAL - VERSIÓN CORREGIDA PARA RAILWAY
// components/mis-clientes/mis-clientes.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { inject } from '@angular/core';
import { ClienteEntrenadorService } from '../../../../src/app/core/services/cliente-entrenador.service';

@Component({
  selector: 'app-mis-clientes',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './mis-clientes.component.html',
  styleUrls: ['./mis-clientes.component.css']
})
export class MisClientesComponent implements OnInit, OnDestroy {
  private clienteEntrenadorSvc = inject(ClienteEntrenadorService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  clientes: any[] = [];
  cargando = true;
  error: string | null = null;
  busqueda = '';
  clienteSeleccionado: any = null;
  mostrarPerfil = false;
  
  // ✅ Para controlar imágenes que fallaron - SIN BUCLE
  imagenesError: Set<string> = new Set();
  defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%236366f1" width="100" height="100"/%3E%3Ctext x="50" y="50" font-size="40" fill="white" text-anchor="middle" dy=".3em"%3E%3F%3C/text%3E%3C/svg%3E';

  // ✅ URL DEL BACKEND - RAILWAY EN PRODUCCIÓN
  private readonly BACKEND_URL = 'https://web-production-03d9e.up.railway.app';

  ngOnInit(): void {
    console.log('🟦 [INIT] MisClientesComponent inicializado');
    console.log('🌐 [CONFIG] Backend URL:', this.BACKEND_URL);
    this.cargarClientes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** 🔑 Obtiene el id del entrenador desde localStorage o del objeto usuario */
  private resolverIdEntrenador(): number {
    const raw = localStorage.getItem('id_entrenador') || '';
    const id = parseInt(raw, 10);
    if (id > 0) return id;

    try {
      const user = JSON.parse(localStorage.getItem('usuario') || 'null');
      if (user?.id && (user.rol === 'entrenador' || user.rol === 'trainer')) {
        return Number(user.id) || 0;
      }
    } catch { /* no-op */ }

    return 0;
  }

  cargarClientes(): void {
    console.log('🟦 [CARGA] Obteniendo clientes del entrenador...');
    this.cargando = true;
    this.error = null;

    const id = this.resolverIdEntrenador();
    if (!id) {
      this.cargando = false;
      this.error = 'No se pudo determinar el id del entrenador.';
      console.error('❌ Falta id_entrenador (localStorage/usuario)');
      return;
    }
    
    // ⬇️ Ahora SIEMPRE enviamos {id} para evitar 405
    this.clienteEntrenadorSvc.misClientes(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clientes: any[]) => {
          console.log('✅ Respuesta del servidor:', clientes);
          
          // 🔧 Procesar y normalizar datos
          this.clientes = this.normalizarClientes(clientes);
          
          // 🔍 Logging para debugging
          if (this.clientes.length > 0) {
            console.log('📊 Primer cliente procesado:', JSON.stringify(this.clientes[0], null, 2));
          }
          
          this.cargando = false;
        },
        error: (err) => {
          console.error('❌ Error al cargar clientes:', err);
          this.error = 'Error al cargar los clientes. Por favor, intenta nuevamente.';
          this.cargando = false;
        }
      });
  }

  /**
   * 🔧 NORMALIZA y PROCESA los datos de clientes
   * Asegura que todos los campos necesarios existan
   */
  private normalizarClientes(clientes: any[]): any[] {
    return clientes.map(item => {
      const cliente = item.cliente || item;
      
      // Normalizar peso
      if (!cliente.peso && cliente.peso_kg) {
        cliente.peso = cliente.peso_kg;
      }
      
      // Normalizar estatura
      if (!cliente.estatura) {
        if (cliente.estatura_cm) {
          cliente.estatura = cliente.estatura_cm;
        } else if (cliente.altura) {
          cliente.estatura = cliente.altura;
        } else if (cliente.height) {
          cliente.estatura = cliente.height;
        }
      }
      
      // Calcular IMC si no existe
      if (!cliente.imc && cliente.peso && cliente.estatura) {
        const altura_m = cliente.estatura > 100 ? cliente.estatura / 100 : cliente.estatura;
        if (altura_m > 0) {
          cliente.imc = parseFloat((cliente.peso / (altura_m * altura_m)).toFixed(2));
        }
      }
      
      return item;
    });
  }

  get clientesFiltrados(): any[] {
    if (!this.busqueda || this.busqueda.trim() === '') {
      return this.clientes;
    }
    
    const termino = this.busqueda.toLowerCase().trim();
    
    return this.clientes.filter(item => {
      const cliente = item.cliente || item;
      
      const nombre = (cliente.nombre || '').toLowerCase();
      if (nombre.includes(termino)) return true;
      
      const apellido = (cliente.apellido || '').toLowerCase();
      if (apellido.includes(termino)) return true;
      
      const email = (cliente.email || '').toLowerCase();
      if (email.includes(termino)) return true;
      
      const nombreCompleto = `${nombre} ${apellido}`;
      if (nombreCompleto.includes(termino)) return true;
      
      return false;
    });
  }

  get totalClientes(): number {
    return this.clientesFiltrados.length;
  }

  /**
   * ✅ CORREGIDO: Obtiene la foto del cliente usando URL de Railway
   */
  getFotoCliente(item: any): string {
    const cliente = item.cliente || item;
    const id = cliente?.id_usuario || Math.random();
    
    // Si ya sabemos que esta imagen falló, retorna avatar
    if (this.imagenesError.has(id)) {
      const iniciales = `${cliente?.nombre?.[0]?.toUpperCase() || '?'}${cliente?.apellido?.[0]?.toUpperCase() || '?'}`;
      return this.generarAvatarConIniciales(iniciales);
    }
    
    let foto = cliente?.foto_url || cliente?.avatar_url;
    
    if (!foto || foto.trim() === '') {
      // Si no hay foto, generar avatar con iniciales
      const iniciales = `${cliente?.nombre?.[0]?.toUpperCase() || '?'}${cliente?.apellido?.[0]?.toUpperCase() || '?'}`;
      return this.generarAvatarConIniciales(iniciales);
    }
    
    // ✅ CONSTRUCCIÓN ROBUSTA DE URL
    
    // 1. Si ya es una URL completa (http/https), devolver tal cual
    if (foto.startsWith('http://') || foto.startsWith('https://')) {
      console.log(`🖼️ URL completa: ${foto}`);
      return foto;
    }
    
    // 2. Si es ruta relativa /uploads/..., construir URL del backend Railway
    if (foto.startsWith('/uploads/')) {
      const urlCompleta = `${this.BACKEND_URL}${foto}`;
      console.log(`🖼️ URL Railway construida: ${urlCompleta}`);
      return urlCompleta;
    }
    
    // 3. Si es data:image/... (imagen en base64)
    if (foto.startsWith('data:')) {
      console.log(`🖼️ Imagen base64`);
      return foto;
    }
    
    // 4. Si contiene localhost o 127.0.0.1 (legacy - reemplazar con Railway)
    if (foto.includes('localhost') || foto.includes('127.0.0.1') || foto.includes('0.0.0.0')) {
      console.warn(`⚠️ URL localhost detectada (legacy): ${foto}`);
      // Intentar extraer el path y reemplazar con Railway
      const cleanPath = foto.split('localhost:8000')[1] || 
                       foto.split('127.0.0.1:8000')[1] || 
                       foto.split('0.0.0.0:8000')[1];
      if (cleanPath) {
        const fixedUrl = `${this.BACKEND_URL}${cleanPath}`;
        console.log(`🔧 URL corregida a Railway: ${fixedUrl}`);
        return fixedUrl;
      }
      // Si no se puede extraer el path, generar avatar
      const iniciales = `${cliente?.nombre?.[0]?.toUpperCase() || '?'}${cliente?.apellido?.[0]?.toUpperCase() || '?'}`;
      return this.generarAvatarConIniciales(iniciales);
    }
    
    // 5. Por defecto, intentar como ruta relativa desde backend Railway
    console.log(`🖼️ Ruta relativa (fallback): ${foto}`);
    const finalUrl = foto.startsWith('/') ? `${this.BACKEND_URL}${foto}` : `${this.BACKEND_URL}/${foto}`;
    console.log(`🖼️ URL final: ${finalUrl}`);
    return finalUrl;
  }

  /**
   * ✅ Maneja el error de imagen - SE LLAMA SOLO UNA VEZ
   */
  onImageError(event: any, clienteId: any): void {
    console.log('🖼️ Error cargando imagen del cliente:', clienteId);
    
    if (!this.imagenesError.has(clienteId)) {
      this.imagenesError.add(clienteId);
      
      // Obtener el cliente para generar avatar
      const cliente = this.clientes
        .find(item => (item.cliente?.id_usuario || item.id_usuario) === clienteId)
        ?.cliente;
      
      if (cliente && event?.target) {
        // Cambiar directamente a avatar con iniciales (sin reintentos)
        const iniciales = `${cliente.nombre?.[0]?.toUpperCase() || '?'}${cliente.apellido?.[0]?.toUpperCase() || '?'}`;
        event.target.src = this.generarAvatarConIniciales(iniciales);
      } else if (event?.target?.src) {
        event.target.src = this.defaultAvatar;
      }
    }
  }

  /**
   * ✅ Generar avatar con iniciales automático
   */
  generarAvatarConIniciales(iniciales: string): string {
    // Array de colores
    const colors = [
      '#6366f1',  // Indigo
      '#3b82f6',  // Blue
      '#10b981',  // Green
      '#f59e0b',  // Amber
      '#ef4444',  // Red
      '#8b5cf6',  // Violet
      '#ec4899',  // Pink
    ];
    
    // Seleccionar color basado en hash de iniciales (consistente)
    const hash = (iniciales.charCodeAt(0) || 0) + (iniciales.charCodeAt(1) || 0);
    const color = colors[hash % colors.length];
    
    // Crear SVG con iniciales
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <style>
            .avatar-background { fill: ${color}; }
            .avatar-text { 
              font: bold 45px sans-serif; 
              fill: white; 
              text-anchor: middle; 
              dominant-baseline: central;
            }
          </style>
        </defs>
        <rect class="avatar-background" width="100" height="100"/>
        <text class="avatar-text" x="50" y="50">${iniciales}</text>
      </svg>
    `;
    
    // Convertir a data URL
    const encoded = encodeURIComponent(svg);
    return `data:image/svg+xml,${encoded}`;
  }

  /**
   * 🔧 Obtiene nombre completo
   */
  getNombreCompleto(item: any): string {
    const cliente = item.cliente || item;
    const nombre = cliente?.nombre || '';
    const apellido = cliente?.apellido || '';
    return `${nombre} ${apellido}`.trim();
  }

  /**
   * 🔧 Obtiene peso con múltiples opciones
   */
  getPeso(item: any): string {
    const cliente = item.cliente || item;
    const peso = cliente?.peso || cliente?.peso_kg;
    return peso ? `${peso}` : '—';
  }

  /**
   * 🔧 Obtiene estatura con múltiples opciones - MEJORADO
   */
  getEstatura(item: any): string {
    const cliente = item.cliente || item;
    
    const estatura = 
      cliente?.estatura || 
      cliente?.estatura_cm ||
      cliente?.altura ||
      cliente?.height ||
      cliente?.talla;
    
    if (!estatura) {
      const clienteId = cliente?.id_usuario || 'desconocido';
      console.warn(`⚠️ [ESTATURA VACÍA] Cliente ${clienteId} (${cliente?.nombre}) no tiene estatura guardada`);
      return '—';
    }
    
    // Asegurar que es número
    const estaturaNum = parseInt(String(estatura));
    if (isNaN(estaturaNum)) {
      return '—';
    }
    
    return String(estaturaNum);
  }

  /**
   * 🔧 Obtiene sexo del cliente
   */
  getSexo(item: any): string {
    const cliente = item.cliente || item;
    return cliente?.sexo || '—';
  }

  /**
   * 🔧 Obtiene antecedentes médicos - MEJORADO
   */
  getAntecedentes(item: any): string {
    const cliente = item.cliente || item;
    const valor = cliente?.antecedentes;
    
    if (!valor || valor === null || valor === undefined) {
      return 'Sin información disponible';
    }
    if (typeof valor === 'string' && valor.trim() === '') {
      return 'Sin información disponible';
    }
    if (typeof valor === 'string') {
      return valor.trim();
    }
    return 'Sin información disponible';
  }

  /**
   * 🔧 Obtiene problemas médicos - MEJORADO
   */
  getProblemasMedicos(item: any): string {
    const cliente = item.cliente || item;
    const valor = cliente?.problemas_medicos;
    
    if (!valor || valor === null || valor === undefined) {
      return 'Ninguno reportado';
    }
    if (typeof valor === 'string' && valor.trim() === '') {
      return 'Ninguno reportado';
    }
    if (typeof valor === 'string') {
      return valor.trim();
    }
    return 'Ninguno reportado';
  }

  /**
   * 🔧 Obtiene enfermedades como array
   */
  getEnfermedades(item: any): string[] {
    const cliente = item.cliente || item;
    
    if (!cliente?.enfermedades) {
      return [];
    }
    if (Array.isArray(cliente.enfermedades)) {
      return cliente.enfermedades;
    }
    if (typeof cliente.enfermedades === 'string') {
      return cliente.enfermedades
        .split(',')
        .map((e: string) => e.trim())
        .filter((e: string) => e.length > 0);
    }
    return [];
  }

  /**
   * 🔧 Obtiene condiciones médicas
   */
  getCondicionesMedicas(item: any): string[] {
    const cliente = item.cliente || item;
    
    if (!cliente?.condiciones_medicas) {
      return [];
    }
    if (Array.isArray(cliente.condiciones_medicas)) {
      return cliente.condiciones_medicas;
    }
    if (typeof cliente.condiciones_medicas === 'string') {
      return cliente.condiciones_medicas
        .split(',')
        .map((c: string) => c.trim())
        .filter((c: string) => c.length > 0);
    }
    return [];
  }

  /**
   * 🔧 Obtiene IMC - Calcula si es necesario
   */
  getImc(item: any): string {
    const cliente = item.cliente || item;
    
    if (cliente?.imc) {
      return cliente.imc.toFixed(2);
    }
    const peso = cliente?.peso || cliente?.peso_kg;
    const estatura = cliente?.estatura || cliente?.estatura_cm || cliente?.altura;
    if (!peso || !estatura) {
      return '—';
    }
    const altura_m = estatura > 100 ? estatura / 100 : estatura;
    if (altura_m <= 0) {
      return '—';
    }
    const imc = peso / (altura_m * altura_m);
    return imc.toFixed(2);
  }

  /**
   * 🔧 Obtiene clasificación del IMC
   */
  getClasificacionImc(item: any): string {
    const imcStr = this.getImc(item);
    const imc = parseFloat(imcStr);
    if (isNaN(imc)) return '—';
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25) return 'Normal';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidad';
  }

  /**
   * 🎨 Obtiene color para el IMC
   */
  getColorImc(item: any): string {
    const imcStr = this.getImc(item);
    const imc = parseFloat(imcStr);
    if (isNaN(imc)) return 'gray';
    if (imc < 18.5) return 'blue';
    if (imc < 25) return 'green';
    if (imc < 30) return 'orange';
    return 'red';
  }

  /**
   * 🚀 TrackBy para mejorar performance
   */
  trackByClienteId(index: number, item: any): any {
    return item.cliente?.id_usuario || item.id_usuario || index;
  }

  /**
   * 👤 Abre el perfil del cliente - MODIFICADO para pasar fecha_contratacion
   */
  abrirPerfil(item: any): void {
    const cliente = item.cliente || item;
    console.log('🟦 Abriendo perfil del cliente:', cliente.nombre);
    this.clienteSeleccionado = cliente;
    // ✅ Guardar la fecha de contratación
    this.clienteSeleccionado.fecha_contratacion = item.fecha_contratacion;
    this.mostrarPerfil = true;
  }

  /**
   * ❌ Cierra el perfil
   */
  cerrarPerfil(): void {
    this.mostrarPerfil = false;
    this.clienteSeleccionado = null;
  }

  /**
   * 📄 Navega al perfil completo
   */
  verPerfil(id_cliente: number): void {
    console.log('🟦 Navegando a perfil del cliente:', id_cliente);
    this.router.navigate(['/entrenador/perfil-cliente', id_cliente]);
  }

  /**
   * 💪 Navega a generar rutina
   */
  generarRutina(id_cliente: number): void {
    console.log('🟦 Navegando a generar rutina para cliente:', id_cliente);
    this.router.navigate(['/entrenador/generar-rutina', id_cliente]);
  }

  /**
   * 🔤 Obtiene iniciales del cliente
   */
  getInicialesCliente(item: any): string {
    const cliente = item.cliente || item;
    const nombre = (cliente.nombre || '').charAt(0).toUpperCase();
    const apellido = (cliente.apellido || '').charAt(0).toUpperCase();
    return nombre + apellido;
  }

  /**
   * 🧹 Limpia búsqueda
   */
  limpiarBusqueda(): void {
    this.busqueda = '';
  }

  /**
   * 🔍 DEBUGGING: Ejecutar en DevTools Console
   * ng.getComponent(document.querySelector('app-mis-clientes')).debugClientData()
   */
  debugClientData(): void {
    console.clear();
    console.log('%c====== DEBUG CLIENTES - COMPLETO ======', 'color: blue; font-weight: bold; font-size: 14px');
    console.log(`Total clientes: ${this.clientes.length}`);
    console.log(`Backend URL: ${this.BACKEND_URL}`);
    
    if (this.clientes.length === 0) {
      console.warn('⚠️ No hay clientes cargados');
      return;
    }
    
    this.clientes.forEach((item, index) => {
      const cliente = item.cliente || item;
      const id = cliente.id_usuario || `desconocido_${index}`;
      
      console.group(`%c📌 Cliente ${index + 1}: ${cliente.nombre} ${cliente.apellido} (ID: ${id})`, 'color: green; font-weight: bold');
      
      // DATOS BRUTOS
      console.log('%c🔍 DATOS BRUTOS DE LA BD:', 'color: purple; font-weight: bold');
      console.table({
        'id_usuario': cliente.id_usuario,
        'nombre': cliente.nombre,
        'apellido': cliente.apellido,
        'email': cliente.email,
        'edad': cliente.edad,
        'peso': cliente.peso,
        'estatura': cliente.estatura ? `✅ ${cliente.estatura}` : '❌ NULL',
        'imc': cliente.imc,
        'sexo': cliente.sexo,
        'foto_url': cliente.foto_url ? `✅ ${cliente.foto_url.substring(0, 40)}...` : '❌ NULL',
        'avatar_url': cliente.avatar_url ? `✅ ${cliente.avatar_url.substring(0, 40)}...` : '❌ NULL',
        'antecedentes': cliente.antecedentes ? `✅ ${cliente.antecedentes}` : '❌ NULL',
        'problemas_medicos': cliente.problemas_medicos ? `✅ ${cliente.problemas_medicos}` : '❌ NULL',
        'enfermedades': cliente.enfermedades ? `✅ ${JSON.stringify(cliente.enfermedades)}` : '❌ NULL',
      });
      
      // VALORES PROCESADOS
      console.log('%c✨ VALORES PROCESADOS POR COMPONENTE:', 'color: green; font-weight: bold');
      console.table({
        'getNombreCompleto()': this.getNombreCompleto(item),
        'getEstatura()': this.getEstatura(item),
        'getPeso()': this.getPeso(item),
        'getImc()': this.getImc(item),
        'getClasificacionImc()': this.getClasificacionImc(item),
        'getSexo()': this.getSexo(item),
        'getAntecedentes()': this.getAntecedentes(item),
        'getProblemasMedicos()': this.getProblemasMedicos(item),
        'getEnfermedades()': JSON.stringify(this.getEnfermedades(item)),
        'getFotoCliente()': this.getFotoCliente(item).substring(0, 60) + '...',
      });
      
      // PROBLEMAS DETECTADOS
      console.log('%c⚠️ PROBLEMAS DETECTADOS:', 'color: red; font-weight: bold');
      
      const problemas: string[] = [];
      
      if (!cliente.estatura) {
        problemas.push('❌ PROBLEMA 1: ESTATURA VACÍA - Verificar BD');
      }
      
      if (!cliente.foto_url && !cliente.avatar_url) {
        problemas.push('⚠️ PROBLEMA 3: SIN FOTO - Usando avatar automático con iniciales');
      }
      
      if (!cliente.antecedentes) {
        problemas.push('⚠️ PROBLEMA 2: Antecedentes no disponibles');
      }
      
      if (!cliente.problemas_medicos) {
        problemas.push('⚠️ PROBLEMA 2: Problemas médicos no disponibles');
      }
      
      if (problemas.length === 0) {
        console.log('%c✅ Sin problemas detectados - Todo está correcto', 'color: green; font-weight: bold');
      } else {
        problemas.forEach(p => console.error(p));
      }
      
      console.groupEnd();
    });
    
    console.log('%c====== FIN DEBUG ======', 'color: blue; font-weight: bold; font-size: 14px');
  }
}