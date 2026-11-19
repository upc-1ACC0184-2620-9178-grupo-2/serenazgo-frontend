import { Component, computed, inject } from '@angular/core';
import { DespachoStore } from '../core/despacho.store';

@Component({
  selector: 'app-unidades-page',
  template: `
  <section class="vista" aria-label="Unidades">
    <h2>Unidades de serenazgo</h2>
    <table>
      <thead><tr><th scope="col">Unidad</th><th scope="col">Tipo</th><th scope="col">Base</th><th scope="col">Estado</th><th scope="col">Acción</th></tr></thead>
      <tbody>
        @for (u of unidades(); track u.id) {
          <tr>
            <td>{{ u.etiqueta }}</td><td>{{ u.tipo }}</td><td>{{ base(u.id_base) }}</td>
            <td>{{ u.disponible ? 'Disponible' : (u.incidente_asignado ? 'Ocupada · #' + u.incidente_asignado : 'Ocupada') }}</td>
            <td><button class="btn secundario" type="button" (click)="store.setUnidad(u.id, !u.disponible)">{{ u.disponible ? 'Marcar ocupada' : 'Marcar disponible' }}</button></td>
          </tr>
        } @empty { <tr><td colspan="5">Sin datos.</td></tr> }
      </tbody>
    </table>
  </section>`,
})
export class UnidadesPage {
  store = inject(DespachoStore);
  base = (id: number) => this.store.red()?.bases.find((b) => b.id === id)?.nombre ?? '';
  unidades = computed(() => {
    const q = this.store.q().trim().toLowerCase();
    return (this.store.estado()?.unidades ?? []).filter((u) => !q || `${u.etiqueta} ${this.base(u.id_base)}`.toLowerCase().includes(q));
  });
}
