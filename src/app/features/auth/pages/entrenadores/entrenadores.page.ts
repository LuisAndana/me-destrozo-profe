// src/app/features/auth/pages/entrenadores/entrenadores.page.ts
import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

import { EntrenadorService } from '../../../../core/services/entrenador.service';
import { TrainersResponse } from '../../../../core/models/trainer.model';
import { EntrenadorCardComponent } from './components/entrenador-card.component';

@Component({
  selector: 'app-entrenadores-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EntrenadorCardComponent],
  templateUrl: './entrenadores.page.html',
  styleUrls: ['./entrenadores.page.css'],
})
export class EntrenadoresPage {
  private fb = inject(FormBuilder);
  private svc = inject(EntrenadorService);

  readonly pageSize = 12;

  filters = this.fb.nonNullable.group({
    q: [''],
    especialidad: [''],
    modalidad: ['' as '' | 'Online' | 'Presencial'],
    ciudad: [''],
    ratingMin: [0],
    precioMax: [''],
    sort: ['relevance' as 'relevance' | 'rating' | 'experience' | 'price_asc' | 'price_desc'],
  });

  // Estado
  page = signal(1);
  total = signal(0);
  loading = signal(true);
  error = signal<string | null>(null);
  lastPage = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  // Observables derivados
  private filters$ = this.filters.valueChanges.pipe(
    startWith(this.filters.getRawValue()),
    debounceTime(300),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    tap(() => {
      // cada vez que cambian los filtros, vuelve a página 1 y muestra loading
      this.error.set(null);
      this.page.set(1);
      this.loading.set(true);
    })
  );

  private page$ = toObservable(this.page);

  data$ = combineLatest([this.filters$, this.page$]).pipe(
    switchMap(([f, page]) => {
      const params = {
        q: f.q || undefined,
        especialidad: f.especialidad || undefined,
        modalidad: (f.modalidad || undefined) as 'Online' | 'Presencial' | undefined,
        ciudad: f.ciudad || undefined,
        ratingMin: f.ratingMin || undefined,
        precioMax: f.precioMax === '' ? undefined : Number(f.precioMax),
        sort: f.sort,
        page,
        pageSize: this.pageSize,
      };
      return this.svc.getEntrenadores(params).pipe(
        catchError(() => {
          this.error.set('No se pudieron cargar entrenadores.');
          return of({
            items: [],
            total: 0,
            page,
            pageSize: this.pageSize,
          } as TrainersResponse);
        })
      );
    }),
    map((res) => {
      this.total.set(res.total);
      this.loading.set(false);
      return res;
    })
  );

  goTo(p: number) {
    if (p < 1 || p > this.lastPage()) return;
    this.loading.set(true);
    this.page.set(p); // esto dispara page$ y vuelve a cargar sin patchValue
  }

  trackByTrainerId(index: number, trainer: any): any {
    return trainer.id;
  }
}