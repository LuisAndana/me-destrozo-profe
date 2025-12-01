import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PerfilVM {
  nombre_completo: string;
  email: string;
  sexo: 'Masculino' | 'Femenino' | 'Otro' | '' | null;
  peso_kg: number | null;
  estatura_cm: number | null;
  edad: number | null;
  imc: number | null;
  problemas: string | null;
  enfermedades: string[];
  foto_url?: string | null;
  avatar_url?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private http = inject(HttpClient);

  /** Base del endpoint del backend */
  private base = `${environment.apiBase}/usuarios`;

  /** Imagen por defecto si el backend no tiene foto */
  readonly defaultAvatar = 'assets/default-avatar.png';

  /** Convierte el campo enfermedades del backend a un array seguro */
  private parseEnfermedades(raw: unknown): string[] {
    if (Array.isArray(raw)) {
      return raw.filter((x): x is string => typeof x === 'string' && !!x.trim());
    }
    if (typeof raw === 'string') {
      const s = raw.trim();
      if (!s) return [];
      if (s.startsWith('[')) {
        try {
          const arr = JSON.parse(s);
          if (Array.isArray(arr)) {
            return arr.filter((x: any) => typeof x === 'string' && !!x.trim());
          }
        } catch {}
      }
      return s.split(',').map(t => t.trim()).filter(Boolean);
    }
    return [];
  }

  /**
   * ✅ CORREGIDO: Obtiene el perfil sin query parameter ?user_id
   * JWT token en Authorization header es suficiente
   */
  getPerfil(userId: number): Observable<PerfilVM> {
    console.log(`📡 GET ${this.base}/me`);
    
    return this.http
      .get<any>(`${this.base}/me`)
      .pipe(
        map(resp => {
          const r = resp?.usuario ?? resp;
          const enfermedades = this.parseEnfermedades(r?.enfermedades);
          const foto_url: string | null =
            r?.foto_url ?? r?.avatar_url ?? r?.avatar ?? this.defaultAvatar;

          return {
            nombre_completo: `${r?.nombre ?? ''} ${r?.apellido ?? ''}`.trim(),
            email: r?.email ?? '',
            sexo: (r?.sexo ?? '') as PerfilVM['sexo'],
            peso_kg: r?.peso_kg ?? null,
            estatura_cm: r?.estatura_cm ?? null,
            edad: r?.edad ?? null,
            imc: r?.imc ?? null,
            problemas: r?.problemas ?? '',
            enfermedades,
            foto_url
          } as PerfilVM;
        })
      );
  }

  /**
   * ✅ CORREGIDO: Guarda los cambios del perfil sin query parameter ?user_id
   * JWT token en Authorization header es suficiente
   */
  savePerfil(vm: Partial<PerfilVM>, userId: number): Observable<PerfilVM> {
    const enfermedadesList = (vm.enfermedades ?? [])
      .filter(s => typeof s === 'string' && !!s.trim());

    const body = {
      sexo: vm.sexo || null,
      edad: vm.edad ?? null,
      peso_kg: vm.peso_kg ?? null,
      estatura_cm: vm.estatura_cm ?? null,
      problemas: (vm.problemas ?? '').trim() || null,
      enfermedades: enfermedadesList
    };

    console.log(`📡 PATCH ${this.base}/perfil`);

    return this.http.patch<PerfilVM>(
      `${this.base}/perfil`,
      body
    );
  }

  /**
   * ✅ CORREGIDO: Sube el avatar del usuario sin query parameter ?user_id
   * JWT token en Authorization header es suficiente
   */
  uploadAvatar(file: File, userId: number): Observable<{ foto_url?: string; avatar_url?: string }> {
    const fd = new FormData();
    fd.append('avatar', file); // 👈 usar 'avatar' porque envías a /usuarios/perfil/avatar

    console.log(`📡 POST ${this.base}/perfil/avatar`);

    return this.http
      .post<{ foto_url?: string; avatar_url?: string }>(
        `${this.base}/perfil/avatar`,
        fd,
        { }
      )
      .pipe(
        map(r => ({
          foto_url: r.foto_url ?? r.avatar_url ?? undefined,
          avatar_url: r.avatar_url ?? r.foto_url ?? undefined
        }))
      );
  }

  /**
   * ✅ CORREGIDO: Elimina el avatar del usuario sin query parameter ?user_id
   * JWT token en Authorization header es suficiente
   */
  deleteAvatar(userId: number): Observable<{ foto_url: string }> {
    console.log(`📡 DELETE ${this.base}/perfil/avatar`);

    return this.http
      .delete(`${this.base}/perfil/avatar`)
      .pipe(
        map(() => ({ foto_url: this.defaultAvatar }))
      );
  }
}