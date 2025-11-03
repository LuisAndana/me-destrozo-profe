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

  /** ✅ Campo principal desde el backend */
  foto_url?: string | null;

  /** Compatibilidad opcional */
  avatar_url?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  // Base del endpoint del backend
  private base = `${environment.apiBase}/usuarios`;

  /** Headers JSON con JWT */
  private jsonHeaders(): HttpHeaders {
    const token = this.auth.getToken() || localStorage.getItem('token');
    let h = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) h = h.set('Authorization', `Bearer ${token}`);
    return h;
  }

  /** Headers para envío de FormData (sin Content-Type) */
  private formHeaders(): HttpHeaders {
    const token = this.auth.getToken() || localStorage.getItem('token');
    let h = new HttpHeaders();
    if (token) h = h.set('Authorization', `Bearer ${token}`);
    return h;
  }

  /** Convierte el campo enfermedades del backend a un array */
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

  /** Obtiene el perfil del usuario autenticado */
  getPerfil(): Observable<PerfilVM> {
    const headers = this.jsonHeaders();

    return this.http.get<any>(`${this.base}/me`, { headers }).pipe(
      map(resp => {
        const r = resp?.usuario ?? resp;
        const enfermedades = this.parseEnfermedades(r?.enfermedades);

        // ✅ Se da prioridad a foto_url (backend real)
        const foto_url: string | null =
          r?.foto_url ?? r?.avatar_url ?? r?.avatar ?? null;

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

  /** Guarda los cambios en el perfil */
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

  /** ✅ Sube la foto de perfil (avatar/foto_url) */
uploadAvatar(file: File): Observable<{ foto_url?: string; avatar_url?: string }> {
  const fd = new FormData();
  fd.append('file', file);

  return this.http
    .post<{ foto_url?: string; avatar_url?: string }>(
      `${this.base}/avatar`,
      fd,
      { headers: this.formHeaders() }
    )
    .pipe(
      map(r => ({
        foto_url: r.foto_url ?? r.avatar_url ?? undefined,
        avatar_url: r.avatar_url ?? r.foto_url ?? undefined
      }))
    );
}


  /** ✅ Elimina la foto de perfil */
  deleteAvatar(): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/avatar`,
      { headers: this.jsonHeaders() }
    );
  }
}
