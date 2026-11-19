import { Component, inject } from '@angular/core';
import { DespachoStore } from '../core/despacho.store';
import { MinutosPipe } from '../core/minutos.pipe';
import { PRIORIDAD } from '../core/models';
import { FormaComponent } from '../components/forma.component';

@Component({
  selector: 'app-incidentes-page',
  imports: [FormaComponent, MinutosPipe],
  template: `
  <section class="vista" aria-label="Incidentes">
    <h2>Incidentes activos</h2>
    <table>
      <thead><tr><th scope="col">Caso</th><th scope="col">Prioridad</th><th scope="col">Tipología</th><th scope="col">Dirección</th><th scope="col">Cobertura</th></tr></thead>
      <tbody>
        @for (i of store.lista(); track i.id_caso) {
          <tr>
            <td>#{{ i.id_caso }}</td>
            <td><app-forma [p]="i.prioridad" /> {{ nombre(i.prioridad) }}</td>
            <td>{{ i.tipologia }}</td><td>{{ i.direccion }}</td>
            <td>@if (store.asigPorId().get(i.id_caso); as e) { {{ e.unidad }} · {{ e.tiempo | minutos }} } @else { <span class="pill-rojo">Sin cobertura</span> }</td>
          </tr>
        } @empty { <tr><td colspan="5">Sin datos.</td></tr> }
      </tbody>
    </table>
  </section>`,
})
export class IncidentesPage {
  store = inject(DespachoStore);
  nombre = (p: 'A' | 'M' | 'B') => PRIORIDAD[p].nombre;
}
