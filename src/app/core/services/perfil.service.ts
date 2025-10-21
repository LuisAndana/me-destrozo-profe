import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface PerfilVM {
  nombre_completo: string;
  email: string;
  sexo: 'Masculino' | 'Femenino' | 'Otro' | '' | null;
  peso_kg: number | null;
  estatura_cm: number | null;
  edad: number | null;
  imc: number | null;
  problemas: string | null;
  enfermedades: string[]; // en UI lo manejamos como array
}

@Injectable({ providedIn: 'root' })
export class PerfilService {
  // Ajusta si tu API corre en otro host/puerto o usa environment.api
  private base = 'http://localhost:8000/usuarios';

  constructor(private http: HttpClient) {}

  private parseEnfermedades(raw: unknown): string[] {
    if (Array.isArray(raw)) {
      return raw.filter((x): x is string => typeof x === 'string' && !!x.trim());
    }
    if (typeof raw === 'string') {
      const s = raw.trim();
      if (!s) return [];
      // Si viene como JSON en string
      if (s.startsWith('[')) {
        try {
          const arr = JSON.parse(s);
          if (Array.isArray(arr)) {
            return arr.filter((x: any) => typeof x === 'string' && !!x.trim());
          }
        } catch {}
      }
      // Si viene CSV
      return s.split(',').map(t => t.trim()).filter(Boolean);
    }
    return [];
    }

  getPerfil(): Observable<PerfilVM> {
    return this.http.get<any>(`${this.base}/me`).pipe(
      map(r => {
        const enfermedades = this.parseEnfermedades(r?.enfermedades);
        return {
          nombre_completo: `${r?.nombre ?? ''} ${r?.apellido ?? ''}`.trim(),
          email: r?.email ?? '',
          sexo: r?.sexo ?? '',
          // backend ahora expone snake_case
          peso_kg: r?.peso_kg ?? null,
          estatura_cm: r?.estatura_cm ?? null,
          edad: r?.edad ?? null,
          imc: r?.imc ?? null,
          problemas: r?.problemas ?? '',
          enfermedades
        } as PerfilVM;
      })
    );
  }

  savePerfil(vm: Partial<PerfilVM>): Observable<PerfilVM> {
    const enfermedadesList =
      (vm.enfermedades ?? []).filter(s => typeof s === 'string' && !!s.trim());

    const body = {
      sexo: vm.sexo || null,
      edad: vm.edad ?? null,
      // enviamos snake_case; el backend también acepta camel, pero mejor consistente
      peso_kg: vm.peso_kg ?? null,
      estatura_cm: vm.estatura_cm ?? null,
      problemas: (vm.problemas ?? '').trim() || null,
      // enviar como array -> el backend lo guarda como JSON
      enfermedades: enfermedadesList
    };

    return this.http.patch<PerfilVM>(
      `${this.base}/perfil`,
      body,
      { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) }
    );
  }
}
