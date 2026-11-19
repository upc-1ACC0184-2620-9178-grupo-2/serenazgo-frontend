import { Component, computed, inject, input } from '@angular/core';
import { DespachoStore } from '../core/despacho.store';
import { MinutosPipe } from '../core/minutos.pipe';
import { PRIORIDAD } from '../core/models';

/** Mapa SVG de la red vial G1. `mini` dibuja solo los incidentes sin cobertura. */
@Component({
  selector: 'app-mapa',
  template: `
  @if (store.proy(); as P) {
    <svg [attr.viewBox]="'0 0 ' + P.W + ' ' + P.H" role="img"
         [attr.aria-label]="mini() ? 'Minimapa de incidentes sin cobertura' : 'Mapa de la red vial con incidentes, bases y rutas recomendadas'"
         (click)="clickMapa($event)">
      <title>{{ mini() ? 'Minimapa sin cobertura' : 'Mapa de la red vial G1' }}</title>
      @if (!mini()) {
        <path [attr.d]="store.calles()" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>
        <path [attr.d]="store.calles()" fill="none" stroke="#C9D2E4" stroke-width="1" stroke-linecap="round"/>
        @for (l of bloqueos(); track $index) {
          <line [attr.x1]="l[0]" [attr.y1]="l[1]" [attr.x2]="l[2]" [attr.y2]="l[3]" stroke="#C62839" stroke-width="4" stroke-dasharray="4 3"/>
        }
        @for (r of otras(); track r.id) {
          <polyline [attr.points]="r.pts" fill="none" stroke="#2F5597" stroke-opacity=".55" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round" stroke-linejoin="round"/>
        }
        @if (ruta(); as r) {
          <polyline [attr.points]="r" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline [attr.points]="r" fill="none" stroke="#17254B" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        }
      } @else {
        <path [attr.d]="store.calles()" fill="none" stroke="#D5DCEA" stroke-width="1.2"/>
      }

      @for (b of bases(); track b.id) {
        <rect [attr.x]="b.x - b.r" [attr.y]="b.y - b.r" [attr.width]="b.r * 2" [attr.height]="b.r * 2" rx="6" fill="#17254B" stroke="#fff" stroke-width="2"/>
        <text [attr.x]="b.x" [attr.y]="b.y + 4.5" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">B</text>
        @if (!mini()) {
          <text [attr.x]="b.x" [attr.y]="b.y + 28" text-anchor="middle" font-size="13" font-weight="600" fill="#17254B" stroke="#fff" stroke-width="4" paint-order="stroke">{{ b.nombre }}</text>
        }
      }

      @for (m of marcadores(); track m.id) {
        <g class="mk" tabindex="0" role="button" [attr.aria-label]="m.desc"
           (click)="elegir(m.id, $event)" (keydown.enter)="elegir(m.id, $event)" (keydown.space)="elegir(m.id, $event)">
          <title>{{ m.desc }}</title>
          @if (!mini()) {
            <circle class="foco" [attr.cx]="m.x" [attr.cy]="m.y" r="17" fill="transparent" [attr.stroke]="m.sel ? '#17254B' : 'none'" stroke-width="2.5"/>
            @if (m.sc) { <circle [attr.cx]="m.x" [attr.cy]="m.y" r="15" fill="none" stroke="#C62839" stroke-width="2" stroke-dasharray="3 3"/> }
          }
          @switch (m.p) {
            @case ('A') { <polygon [attr.points]="m.tri" class="fA"/> }
            @case ('M') { <circle [attr.cx]="m.x" [attr.cy]="m.y" [attr.r]="m.r" class="fM"/> }
            @default { <rect [attr.x]="m.x - m.r * .9" [attr.y]="m.y - m.r * .9" [attr.width]="m.r * 1.8" [attr.height]="m.r * 1.8" rx="2" class="fB"/> }
          }
        </g>
      }

      @if (!mini()) {
        @if (etiqueta(); as e) {
          <text [attr.x]="e.x" [attr.y]="e.y" text-anchor="middle" font-size="14" font-weight="700" fill="#17254B" stroke="#fff" stroke-width="4" paint-order="stroke">#{{ e.id }}</text>
        }
        @if (pastilla(); as t) {
          <rect [attr.x]="t.x - t.w / 2" [attr.y]="t.y - 14" [attr.width]="t.w" height="26" rx="13" fill="#17254B"/>
          <text [attr.x]="t.x" [attr.y]="t.y + 4" text-anchor="middle" font-size="13" font-weight="600" fill="#fff">{{ t.texto }}</text>
        }
        @if (punto(); as p) {
          <circle [attr.cx]="p.x" [attr.cy]="p.y" r="14" fill="none" stroke="#17254B" stroke-width="3" stroke-dasharray="4 3"/>
          <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3" fill="#17254B"/>
        }
      }
    </svg>
  }`,
})
export class MapaComponent {
  store = inject(DespachoStore);
  mini = input(false);
  private min = new MinutosPipe();

  private pts = (ruta: number[][]) => {
    const P = this.store.proy()!;
    return ruta.map(([x, y]) => `${P.X(x).toFixed(1)},${P.Y(y).toFixed(1)}`).join(' ');
  };

  bases = computed(() => {
    const P = this.store.proy(), r = this.store.red();
    if (!P || !r) return [];
    return r.bases.map((b) => ({ id: b.id, nombre: b.nombre, x: P.X(b.x), y: P.Y(b.y), r: this.mini() ? 14 : 11 }));
  });
  bloqueos = computed(() => {
    const P = this.store.proy(), r = this.store.red();
    if (!P || !r) return [];
    return r.bloqueados.map(([u, v]) => [P.X(r.nodos[u][0]), P.Y(r.nodos[u][1]), P.X(r.nodos[v][0]), P.Y(r.nodos[v][1])]);
  });
  otras = computed(() => this.store.asignaciones()
    .filter((a) => a.incidente_id !== this.store.sel())
    .map((a) => ({ id: a.incidente_id, pts: this.pts(a.ruta) })));
  ruta = computed(() => { const a = this.store.asigSel(); return a ? this.pts(a.ruta) : null; });

  marcadores = computed(() => {
    const P = this.store.proy();
    if (!P) return [];
    const map = this.store.asigPorId(), sc = this.store.sinCobPorId(), sel = this.store.sel();
    const r = this.mini() ? 14 : 10;
    return this.store.incidentes()
      .filter((i) => !this.mini() || sc.has(i.id_caso))
      .map((i) => {
        const x = P.X(i.x), y = P.Y(i.y), e = map.get(i.id_caso);
        return {
          id: i.id_caso, p: i.prioridad, x, y, r, sel: i.id_caso === sel, sc: sc.has(i.id_caso),
          tri: `${x},${y - r} ${x + r},${y + r * .85} ${x - r},${y + r * .85}`,
          desc: `Incidente ${i.id_caso}, prioridad ${PRIORIDAD[i.prioridad].nombre}, ${i.tipologia}. ` +
            (e ? `Unidad ${e.unidad}, ${this.min.transform(e.tiempo)}.` : 'Sin cobertura.'),
        };
      });
  });
  etiqueta = computed(() => {
    const P = this.store.proy(), i = this.store.seleccionado();
    return P && i ? { id: i.id_caso, x: P.X(i.x), y: P.Y(i.y) - 26 } : null;
  });
  pastilla = computed(() => {
    const P = this.store.proy(), a = this.store.asigSel();
    if (!P || !a || a.ruta.length < 2) return null;
    const m = a.ruta[Math.floor(a.ruta.length / 2)], texto = `${this.min.transform(a.tiempo)} · ${a.unidad}`;
    return { x: P.X(m[0]), y: P.Y(m[1]) - 22, w: texto.length * 7.4 + 20, texto };
  });
  punto = computed(() => {
    const P = this.store.proy(), p = this.store.punto();
    return P && p ? { x: P.X(p.x), y: P.Y(p.y) } : null;
  });

  elegir(id: string, e: Event): void {
    if (this.mini() || this.store.ubicando()) return;   // en modo ubicar el clic llega al mapa
    e.preventDefault();
    e.stopPropagation();
    this.store.seleccionar(id);
  }
  clickMapa(e: MouseEvent): void {
    const P = this.store.proy();
    if (this.mini() || !this.store.ubicando() || !P) return;
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    this.store.puntoDesdeMapa(P.ix((e.clientX - r.left) / r.width * P.W), P.iy((e.clientY - r.top) / r.height * P.H));
  }
}
