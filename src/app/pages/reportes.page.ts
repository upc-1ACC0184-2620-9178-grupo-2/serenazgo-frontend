import { Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';
import { DespachoStore } from '../core/despacho.store';
import { MinutosPipe } from '../core/minutos.pipe';
import { Decision } from '../core/models';

@Component({
  selector: 'app-reportes-page',
  imports: [MinutosPipe],
  template: `
  <section class="vista" aria-label="Reportes">
    <h2>Reportes</h2>
    @if (store.asig(); as a) {
      <div class="kpis">
        <div class="kpi"><b>{{ a.metricas.atendibles }} / {{ a.metricas.incidentes_activos }}</b><span>Atendibles dentro de Tmax</span></div>
        <div class="kpi"><b>{{ a.metricas.tiempo_medio | minutos }}</b><span>Tiempo medio de respuesta</span></div>
        <div class="kpi"><b>{{ a.metricas.flujo_maximo }}</b><span>Flujo máximo (Ford-Fulkerson)</span></div>
        <div class="kpi"><b>{{ a.metricas.calculo_ms }} ms</b><span>Cálculo del ciclo</span></div>
      </div>
    }
    <h2>Registro de decisiones (RNF04)</h2>
    <table>
      <thead><tr><th scope="col">Hora</th><th scope="col">Tipo</th><th scope="col">Detalle</th></tr></thead>
      <tbody>
        @for (d of decisiones(); track $index) {
          <tr><td>{{ d.ts.slice(11) }}</td><td>{{ d.tipo }}</td><td>{{ detalle(d) }}</td></tr>
        } @empty { <tr><td colspan="3">Sin datos.</td></tr> }
      </tbody>
    </table>
  </section>`,
})
export class ReportesPage implements OnInit {
  store = inject(DespachoStore);
  private api = inject(ApiService);
  decisiones = signal<Decision[]>([]);

  async ngOnInit(): Promise<void> {
    try { this.decisiones.set((await firstValueFrom(this.api.decisiones())).slice(0, 60)); } catch { /* sin registro */ }
  }
  detalle(d: Decision): string {
    const { ts, tipo, ...r } = d;
    void ts; void tipo;
    return Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(' · ');
  }
}
