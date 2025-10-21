import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pagina-principal-entrenador',
  imports: [],
  templateUrl: './pagina-principal-entrenador.html',
  styleUrl: './pagina-principal-entrenador.css'
})
export class PaginaPrincipalEntrenador {

constructor(private router: Router) {}

logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  this.router.navigate(['/']);
}

}
