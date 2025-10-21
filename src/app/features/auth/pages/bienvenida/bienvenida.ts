// src/app/features/bienvenida/bienvenida.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';


@Component({
  standalone: true,
  selector: 'app-bienvenida',
  imports: [RouterLink],
  templateUrl: './bienvenida.html',
  styleUrls: ['./bienvenida.css'],
})
export class Bienvenida {
  constructor(private router: Router) {}

  irRegister() {
    this.router.navigate(['/registro']);
  }

  irLogin() {
    this.router.navigate(['/login']);
  }
}
