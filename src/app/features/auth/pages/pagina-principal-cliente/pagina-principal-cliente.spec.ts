import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaginaPrincipalCliente } from './pagina-principal-cliente';

describe('PaginaPrincipalcliente', () => {
  let component: PaginaPrincipalCliente;
  let fixture: ComponentFixture<PaginaPrincipalCliente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginaPrincipalCliente]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaginaPrincipalCliente);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
