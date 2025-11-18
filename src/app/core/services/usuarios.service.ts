// src/core/services/usuarios.service.ts
// Servicio para obtener información de usuarios - VERSIÓN CORREGIDA

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * ✅ INTERFAZ CORREGIDA - foto_url puede ser string | null | undefined
 */
interface Usuario {
  id_usuario: number;
  nombre: string;
  apellido?: string;
  email?: string;
  foto_url?: string | null;  // ✅ Permite null
  rol?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private http = inject(HttpClient);
  private apiUrl = '/api/usuarios'; // Ajusta según tu backend

  /**
   * 👤 Obtiene la información de un usuario por su ID
   * @param idUsuario ID del usuario a obtener
   * @returns Observable con la información del usuario
   */
  obtenerUsuario(idUsuario: number): Observable<Usuario> {
    console.log('📋 Obteniendo usuario:', idUsuario);
    
    return this.http.get<Usuario>(`${this.apiUrl}/${idUsuario}`)
      .pipe(
        catchError((error) => {
          console.error('❌ Error al obtener usuario:', error);
          // ✅ CORREGIDO: Type assertion para asegurar tipo correcto
          const usuarioPlaceholder: Usuario = {
            id_usuario: idUsuario,
            nombre: `Usuario ${idUsuario}`,
            apellido: '',
            email: '',
            foto_url: null,  // ✅ Ahora compatible con Usuario
            rol: 'usuario'
          };
          return of(usuarioPlaceholder);
        })
      );
  }

  /**
   * 🔍 Obtiene múltiples usuarios por sus IDs
   * @param ids Array de IDs de usuarios
   * @returns Observable con array de usuarios
   */
  obtenerUsuarios(ids: number[]): Observable<Usuario[]> {
    return this.http.post<Usuario[]>(`${this.apiUrl}/bulk`, { ids })
      .pipe(
        catchError((error) => {
          console.error('❌ Error al obtener usuarios:', error);
          return of([]);
        })
      );
  }

  /**
   * 🔎 Busca usuarios por nombre o email
   * @param query String de búsqueda
   * @returns Observable con array de usuarios encontrados
   */
  buscarUsuarios(query: string): Observable<Usuario[]> {
    console.log('🔎 Buscando usuarios:', query);
    
    return this.http.get<Usuario[]>(`${this.apiUrl}/buscar`, {
      params: { q: query }
    })
      .pipe(
        catchError((error) => {
          console.error('❌ Error al buscar usuarios:', error);
          return of([]);
        })
      );
  }

  /**
   * ✏️ Actualiza la información de un usuario
   * @param idUsuario ID del usuario
   * @param datos Datos a actualizar
   * @returns Observable con usuario actualizado
   */
  actualizarUsuario(idUsuario: number, datos: Partial<Usuario>): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${idUsuario}`, datos)
      .pipe(
        catchError((error) => {
          console.error('❌ Error al actualizar usuario:', error);
          throw error;
        })
      );
  }

  /**
   * 🖼️ Actualiza la foto de perfil de un usuario
   * @param idUsuario ID del usuario
   * @param archivo Archivo de imagen
   * @returns Observable con URL de la foto
   */
  actualizarFoto(idUsuario: number, archivo: File): Observable<{ foto_url: string }> {
    const formData = new FormData();
    formData.append('foto', archivo);

    return this.http.post<{ foto_url: string }>(`${this.apiUrl}/${idUsuario}/foto`, formData)
      .pipe(
        catchError((error) => {
          console.error('❌ Error al actualizar foto:', error);
          throw error;
        })
      );
  }

  /**
   * ✅ Verifica si un usuario existe
   * @param idUsuario ID del usuario
   * @returns Observable<boolean>
   */
  usuarioExiste(idUsuario: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/${idUsuario}/existe`)
      .pipe(
        catchError((error) => {
          console.error('❌ Error al verificar usuario:', error);
          return of(false);
        })
      );
  }

  /**
   * 👥 Obtiene el perfil completo de un usuario
   * (Incluye más información que obtenerUsuario)
   * @param idUsuario ID del usuario
   * @returns Observable con perfil completo
   */
  obtenerPerfil(idUsuario: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${idUsuario}/perfil`)
      .pipe(
        catchError((error) => {
          console.error('❌ Error al obtener perfil:', error);
          // ✅ CORREGIDO: Retornar perfil con tipos compatibles
          const perfilPlaceholder = {
            id_usuario: idUsuario,
            nombre: `Usuario ${idUsuario}`,
            apellido: '',
            email: '',
            foto_url: null,
            rol: 'usuario',
            descripcion: '',
            experiencia: ''
          };
          return of(perfilPlaceholder);
        })
      );
  }
}