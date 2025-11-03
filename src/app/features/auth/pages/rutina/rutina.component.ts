import { Component, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-rutina',
  standalone: true,
  imports: [CommonModule, FormsModule, TitleCasePipe],
  templateUrl: './rutina.component.html',
  styleUrls: ['./rutina.component.css']
})
export class RutinaComponent implements OnInit {
  rutina: any[] = [];
  rutinaFiltrada: any[] = [];
  cargando = false;
  error = '';
  semanaSeleccionada: string = '';

  ngOnInit() {
    this.cargarRutina();
  }

  cargarRutina() {
    this.cargando = true;
    this.error = '';
    setTimeout(() => {
      this.cargando = false;
      this.rutina = [];
      this.rutinaFiltrada = [...this.rutina];
    }, 1000);
  }

  filtrarPorSemana() {
    if (!this.semanaSeleccionada) {
      this.rutinaFiltrada = [...this.rutina];
      return;
    }
    const [anio, semana] = this.semanaSeleccionada.split('-W').map(Number);
    const primerDia = new Date(anio, 0, (semana - 1) * 7 + 1);
    const ultimoDia = new Date(primerDia);
    ultimoDia.setDate(primerDia.getDate() + 6);

    this.rutinaFiltrada = this.rutina.filter((dia) => {
      const fecha = new Date(dia.fecha);
      return fecha >= primerDia && fecha <= ultimoDia;
    });
  }
}
