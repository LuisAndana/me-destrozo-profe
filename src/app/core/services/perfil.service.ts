// src/app/core/services/perfil.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

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
  avatar_url?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  // Ajustado a environment
  private base = `${environment.apiBase}/usuarios`;

  private jsonHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    let h = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) h = h.set('Authorization', `Bearer ${token}`);
    return h;
  }

  private formHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    let h = new HttpHeaders();
    if (token) h = h.set('Authorization', `Bearer ${token}`);
    return h;
  }

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

  getPerfil(): Observable<PerfilVM> {
    return this.http.get<any>(`${this.base}/me`, { headers: this.jsonHeaders() }).pipe(
      map(r => {
        const enfermedades = this.parseEnfermedades(r?.enfermedades);
        const avatar_url: string | null =
          r?.avatar_url ?? r?.avatar ?? r?.foto_url ?? null;

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
          avatar_url
        } as PerfilVM;
      })
    );
  }

  savePerfil(vm: Partial<PerfilVM>): Observable<PerfilVM> {
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

    return this.http.patch<PerfilVM>(
      `${this.base}/perfil`,
      body,
      { headers: this.jsonHeaders() }
    );
  }

  /** Sube el avatar del usuario.
   *  Espera que el backend responda: { url: string } y devolvemos { avatar_url } */
  uploadAvatar(file: File): Observable<{ avatar_url: string }> {
    const fd = new FormData();
    fd.append('avatar', file);
    return this.http.post<{ url: string }>(`${this.base}/perfil/avatar`, fd, { headers: this.formHeaders() })
      .pipe(map(r => ({ avatar_url: r.url })));
  }

  /** Elimina el avatar del usuario. */
  deleteAvatar(): Observable<void> {
    return this.http.delete<void>(`${this.base}/perfil/avatar`, { headers: this.jsonHeaders() });
  }
}
