import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaginaPrincipalEntrenador } from './pagina-principal-entrenador';

describe('PaginaPrincipalEntrenador', () => {
  let component: PaginaPrincipalEntrenador;
  let fixture: ComponentFixture<PaginaPrincipalEntrenador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginaPrincipalEntrenador]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaginaPrincipalEntrenador);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
