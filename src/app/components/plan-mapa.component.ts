import { Component, computed, inject } from '@angular/core';
import { PlanStore } from '../core/plan.store';

/** Mapa del plan: eventos, serenazgos en su posición actual, ruta del seleccionado y redistribución. */
@Component({
  selector: 'app-plan-mapa',
  template: `
  @if (store.base.proy(); as P) {
    @if (store.vista(); as v) {
      <svg [attr.viewBox]="'0 0 ' + P.W + ' ' + P.H" role="img"
           aria-label="Mapa del plan de turno con eventos y serenazgos" (click)="clickMapa($event)">
        <title>Mapa del plan de turno</title>
        <path [attr.d]="store.base.calles()" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>
        <path [attr.d]="store.base.calles()" fill="none" stroke="#C9D2E4" stroke-width="1" stroke-linecap="round"/>

        @for (f of flechas(); track f.id) {
          <line [attr.x1]="f.x1" [attr.y1]="f.y1" [attr.x2]="f.x2" [attr.y2]="f.y2" stroke="#2F5597" stroke-opacity=".55" stroke-width="1.5" stroke-dasharray="3 3"/>
        }
        @if (ruta(); as r) {
          <polyline [attr.points]="r" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline [attr.points]="r" fill="none" stroke="#17254B" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
        }
        @for (b of bases(); track b.id) {
          <rect [attr.x]="b.x - 10" [attr.y]="b.y - 10" width="20" height="20" rx="6" fill="#17254B" stroke="#fff" stroke-width="2"/>
          <text [attr.x]="b.x" [attr.y]="b.y + 4.5" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">B</text>
        }

        @for (e of eventos(); track e.id) {
          <g class="mk" tabindex="0" role="button" [attr.aria-label]="e.desc" [style.opacity]="e.opacidad"
             (click)="elegirEvento(e.id, $event)" (keydown.enter)="elegirEvento(e.id, $event)">
            <title>{{ e.desc }}</title>
            <circle class="foco" [attr.cx]="e.x" [attr.cy]="e.y" r="15" fill="transparent" [attr.stroke]="e.sel ? '#17254B' : 'none'" stroke-width="2.5"/>
            @if (e.estado === 'sin_cobertura') { <circle [attr.cx]="e.x" [attr.cy]="e.y" r="14" fill="none" stroke="#C62839" stroke-width="2" stroke-dasharray="3 3"/> }
            @if (e.estado === 'cancelado') {
              <path [attr.d]="'M' + (e.x - 6) + ' ' + (e.y - 6) + 'L' + (e.x + 6) + ' ' + (e.y + 6) + 'M' + (e.x + 6) + ' ' + (e.y - 6) + 'L' + (e.x - 6) + ' ' + (e.y + 6)" stroke="#6B7490" stroke-width="3" stroke-linecap="round"/>
            } @else {
              @switch (e.p) {
                @case ('A') { <polygon [attr.points]="e.tri" class="fA"/> }
                @case ('M') { <circle [attr.cx]="e.x" [attr.cy]="e.y" r="8" class="fM"/> }
                @default { <rect [attr.x]="e.x - 7" [attr.y]="e.y - 7" width="14" height="14" rx="2" class="fB"/> }
              }
            }
            @if (e.orden) {
              <text [attr.x]="e.x + 11" [attr.y]="e.y - 9" font-size="15" font-weight="700" fill="#17254B" stroke="#fff" stroke-width="4" paint-order="stroke">{{ e.orden }}</text>
            }
          </g>
        }

        @for (u of unidades(); track u.id) {
          <g class="mk" tabindex="0" role="button" [attr.aria-label]="u.desc" (click)="elegirUnidad(u.id, $event)" (keydown.enter)="elegirUnidad(u.id, $event)">
            <title>{{ u.desc }}</title>
            @if (u.sel) { <circle [attr.cx]="u.x" [attr.cy]="u.y" r="11" fill="none" stroke="#17254B" stroke-width="3"/> }
            <circle [attr.cx]="u.x" [attr.cy]="u.y" [attr.r]="u.sel ? 6 : 4" [class]="'u-' + u.estado" stroke="#fff" stroke-width="1.5"/>
          </g>
        }
      </svg>
    }
  }`,
})
export class PlanMapaComponent {
  store = inject(PlanStore);

  private px = (x: number, y: number) => { const P = this.store.base.proy()!; return [P.X(x), P.Y(y)]; };

  bases = computed(() => (this.store.vista()?.bases ?? []).map((b) => { const [x, y] = this.px(b.x, b.y); return { id: b.id, x, y }; }));

  eventos = computed(() => {
    const v = this.store.vista();
    if (!v || !this.store.base.proy()) return [];
    const orden = new Map((this.store.serenazgoSel()?.eventos ?? [])
      .filter((id) => this.store.eventosPorId().get(id)?.estado !== 'cancelado')
      .map((id, i) => [id, i + 1]));
    const sel = this.store.selEvento();
    const nom: Record<string, string> = { A: 'Alta', M: 'Media', B: 'Baja' };
    return v.eventos.map((e) => {
      const [x, y] = this.px(e.x, e.y);
      return {
        id: e.id, p: e.prioridad, x, y, estado: e.estado, sel: e.id === sel, orden: orden.get(e.id) ?? 0,
        opacidad: e.estado === 'atendido' ? 0.3 : e.estado === 'cancelado' ? 0.7 : e.programado ? 0.65 : 1,
        tri: `${x},${y - 9} ${x + 9},${y + 8} ${x - 9},${y + 8}`,
        desc: `Evento ${e.id}, prioridad ${nom[e.prioridad]}, ${e.tipologia}, ${e.estado}` +
          (e.serenazgo_id ? `, ${this.store.etiqueta(e.serenazgo_id)}` : ''),
      };
    });
  });

  unidades = computed(() => {
    const v = this.store.vista();
    if (!v || !this.store.base.proy()) return [];
    const sel = this.store.sel();
    return v.serenazgos.map((s) => {
      const [x, y] = this.px(s.x, s.y);
      return { id: s.id, x, y, estado: s.estado, sel: s.id === sel,
        desc: `${s.etiqueta}, ${s.estado}, eventos: ${s.eventos.join(', ') || 'ninguno'}` };
    });
  });

  /** Líneas rectas entre los eventos del serenazgo seleccionado (el recorrido real va por calles). */
  flechas = computed(() => {
    const s = this.store.serenazgoSel();
    const R = this.store.redistribucion();
    const out: { id: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    if (!this.store.base.proy()) return out;
    if (s) {
      const pts = s.tareas.filter((t) => t.tipo === 'evento').map((t) => this.px(t.x, t.y));
      pts.slice(1).forEach((p, i) => out.push({ id: 's' + i, x1: pts[i][0], y1: pts[i][1], x2: p[0], y2: p[1] }));
    }
    R?.movimientos.forEach((m) => {
      const a = this.px(m.desde[0], m.desde[1]), b = this.px(m.hacia[0], m.hacia[1]);
      out.push({ id: 'm' + m.serenazgo_id, x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
    });
    return out;
  });

  ruta = computed(() => {
    const r = this.store.ruta();
    if (!r.length || !this.store.base.proy()) return null;
    return r.map(([x, y]) => this.px(x, y).map((n) => n.toFixed(1)).join(',')).join(' ');
  });

  elegirEvento(id: number, e: Event): void {
    if (this.store.modoAgregar()) return;
    e.stopPropagation();
    this.store.seleccionarEvento(id);
  }
  elegirUnidad(id: number, e: Event): void {
    if (this.store.modoAgregar()) return;
    e.stopPropagation();
    this.store.seleccionarSerenazgo(this.store.sel() === id ? null : id);
  }
  clickMapa(e: MouseEvent): void {
    const P = this.store.base.proy();
    if (!this.store.modoAgregar() || !P) return;
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    this.store.agregarEvento(P.ix((e.clientX - r.left) / r.width * P.W), P.iy((e.clientY - r.top) / r.height * P.H));
  }
}
