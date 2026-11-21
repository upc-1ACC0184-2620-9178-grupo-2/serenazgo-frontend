import { Component, computed, inject } from '@angular/core';
import { PlanStore } from '../core/plan.store';

/** Línea de tiempo (Gantt) del turno: una fila por serenazgo, de 0 a 8 horas. */
@Component({
  selector: 'app-plan-timeline',
  template: `
  @if (g(); as G) {
    <svg [attr.viewBox]="'0 0 ' + G.W + ' ' + G.H" role="img" aria-label="Línea de tiempo del turno por serenazgo" class="gantt">
      @for (h of G.horas; track h.x) {
        <line [attr.x1]="h.x" y1="18" [attr.x2]="h.x" [attr.y2]="G.H" stroke="#DCE2EE" stroke-width="1"/>
        <text [attr.x]="h.x" y="12" text-anchor="middle" font-size="11" fill="#56627F">{{ h.t }}</text>
      }
      @for (f of G.filas; track f.id) {
        <g class="fila" (click)="store.seleccionarSerenazgo(store.sel() === f.id ? null : f.id)">
          <rect x="0" [attr.y]="f.y" [attr.width]="G.W" height="15" [attr.fill]="f.sel ? '#E8EEFB' : 'transparent'"/>
          <text x="6" [attr.y]="f.y + 11" font-size="11" [attr.font-weight]="f.sel ? 700 : 400" fill="#1B2440">{{ f.etiqueta }}</text>
          @for (t of f.tareas; track $index) {
            @if (t.viaje) { <rect [attr.x]="t.vx" [attr.y]="f.y + 6" [attr.width]="t.vw" height="3" fill="#B9C4E4"/> }
            <rect [attr.x]="t.x" [attr.y]="f.y + 2" [attr.width]="t.w" height="11" rx="2" [class]="t.clase"><title>{{ t.titulo }}</title></rect>
          }
        </g>
      }
      <line [attr.x1]="G.ahora" y1="16" [attr.x2]="G.ahora" [attr.y2]="G.H" stroke="#C62839" stroke-width="2"/>
    </svg>
  }`,
})
export class PlanTimelineComponent {
  store = inject(PlanStore);

  g = computed(() => {
    const v = this.store.vista();
    if (!v) return null;
    const L = 110, W = 900, ancho = W - L - 10, dur = v.turno.duracion_min, H0 = 22;
    const X = (m: number) => L + (m / dur) * ancho;
    const lista = [...v.serenazgos]
      .filter((s) => this.store.mostrarTodos() || s.tareas.length > 0 || s.id === this.store.sel())
      .sort((a, b) => b.eventos.length - a.eventos.length || a.id - b.id);
    const filas = lista.map((s, i) => ({
      id: s.id, etiqueta: s.etiqueta, y: H0 + i * 15, sel: s.id === this.store.sel(),
      tareas: s.tareas.map((t) => {
        const e = t.evento_id != null ? this.store.eventosPorId().get(t.evento_id) : undefined;
        const clase = t.tipo === 'reposicion' ? 'g-rep' : t.tipo === 'cancelada' ? 'g-can' : 'g-' + (e?.prioridad ?? 'M');
        const titulo = t.tipo === 'reposicion'
          ? `Reposición ${this.store.hora(t.salida)}–${this.store.hora(t.fin)}`
          : `Evento ${t.evento_id}${e ? ' · ' + e.tipologia : ''} · ${this.store.hora(t.inicio)}–${this.store.hora(t.fin)}`
            + (t.retraso > 0 ? ` · retraso ${t.retraso} min` : '');
        return { x: X(t.inicio), w: Math.max(2, X(t.fin) - X(t.inicio)), clase, titulo,
          viaje: t.llegada > t.salida, vx: X(t.salida), vw: Math.max(1, X(t.llegada) - X(t.salida)) };
      }),
    }));
    const horas = [];
    for (let m = 0; m <= dur; m += 60) horas.push({ x: X(m), t: this.store.hora(m) });
    return { W, H: H0 + filas.length * 15 + 4, filas, horas, ahora: X(v.turno.ahora_min) };
  });
}
