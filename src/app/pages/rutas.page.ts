import { Component, inject } from '@angular/core';
import { DespachoStore } from '../core/despacho.store';
import { MinutosPipe } from '../core/minutos.pipe';

@Component({
  selector: 'app-rutas-page',
  imports: [MinutosPipe],
  template: `
  <section class="vista" aria-label="Rutas">
    <h2>Rutas recomendadas</h2>
    <table>
      <thead><tr><th scope="col">Incidente</th><th scope="col">Unidad</th><th scope="col">Base</th><th scope="col">Tiempo</th><th scope="col">Tramos</th></tr></thead>
      <tbody>
        @for (a of store.asignaciones(); track a.incidente_id) {
          <tr><td>#{{ a.incidente_id }}</td><td>{{ a.unidad }}</td><td>{{ a.base }}</td><td>{{ a.tiempo | minutos }}</td><td>{{ a.ruta.length - 1 }}</td></tr>
        } @empty { <tr><td colspan="5">Sin datos.</td></tr> }
      </tbody>
    </table>
  </section>`,
})
export class RutasPage {
  store = inject(DespachoStore);
}
