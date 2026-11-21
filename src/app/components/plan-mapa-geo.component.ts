import { Component, ElementRef, OnDestroy, computed, effect, inject, signal, viewChild } from '@angular/core';
import * as L from 'leaflet';
import { crearGeo } from '../core/geo';
import { PRIORIDAD } from '../core/models';
import { PlanStore } from '../core/plan.store';
import { crearMapa, encuadrar, iconoBase, iconoEvento, popupBase, resumenPorTipo } from './mapa-base';

const COLOR_ESTADO: Record<string, string> = {
  libre: '#1F8F55', en_camino: '#F2A71B', atendiendo: '#C62839', baja: '#9AA3B5',
};

/** Mapa del plan de turno sobre OpenStreetMap (Ventanilla): eventos, serenazgos en vivo y recorridos. */
@Component({
  selector: 'app-plan-mapa-geo',
  template: `<div #host class="mapa-geo" role="application"
       aria-label="Mapa de Ventanilla con eventos y serenazgos. Arrastra para mover y usa la rueda para acercar."></div>
     <button class="btn mini centrar" type="button" (click)="centrar()" aria-label="Volver a encuadrar Ventanilla">Centrar</button>`,
})
export class PlanMapaGeoComponent implements OnDestroy {
  store = inject(PlanStore);
  private host = viewChild.required<ElementRef<HTMLElement>>('host');
  private map?: L.Map;
  private calles = L.layerGroup();
  private bases = L.layerGroup();
  private lineas = L.layerGroup();
  private eventos = L.layerGroup();
  private unidades = L.layerGroup();
  private listo = signal(false);

  geo = computed(() => { const r = this.store.base.red(); return r ? crearGeo(r.limites) : null; });

  constructor() {
    effect(() => {
      const g = this.geo();
      if (!g || this.map) return;
      const map = this.map = crearMapa(this.host().nativeElement, g);
      [this.calles, this.lineas, this.bases, this.eventos, this.unidades].forEach((l) => l.addTo(map));
      L.control.layers(undefined, { 'Red vial simulada': this.calles }, { collapsed: true, position: 'topright' }).addTo(map);
      map.removeLayer(this.calles);                         // por defecto solo se ve el mapa real
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (!this.store.modoAgregar()) return;
        const [x, y] = g.aKm(e.latlng.lat, e.latlng.lng);
        this.store.agregarEvento(x, y);
      });
      this.listo.set(true);
    });

    effect(() => {
      const r = this.store.base.red(), g = this.geo(), v = this.store.vista();
      if (!this.listo() || !r || !g) return;
      this.calles.clearLayers();
      L.polyline(r.aristas.map(([a, b]) => [g.aLatLng(r.nodos[a][0], r.nodos[a][1]), g.aLatLng(r.nodos[b][0], r.nodos[b][1])] as L.LatLngTuple[]),
        { color: '#2F5597', weight: 1, opacity: 0.35, interactive: false }).addTo(this.calles);
      this.bases.clearLayers();
      (v?.bases ?? r.bases).forEach((b) => L.marker(g.aLatLng(b.x, b.y), { icon: iconoBase(), title: b.nombre, zIndexOffset: 500 })
        .bindTooltip(b.nombre + ' · clic para ver sus serenazgos', { direction: 'bottom', offset: [0, 10] })
        .bindPopup(() => this.infoBase(b.id, b.nombre)).addTo(this.bases));
    });

    // eventos
    effect(() => {
      const v = this.store.vista(), g = this.geo(), sel = this.store.selEvento(), ser = this.store.serenazgoSel();
      if (!this.listo() || !v || !g) return;
      this.eventos.clearLayers();
      const orden = new Map((ser?.eventos ?? []).filter((id) => this.store.eventosPorId().get(id)?.estado !== 'cancelado').map((id, i) => [id, i + 1]));
      v.eventos.forEach((e) => {
        const desc = `Evento ${e.id}, prioridad ${PRIORIDAD[e.prioridad].nombre}, ${e.tipologia}, ${e.estado}` +
          (e.serenazgo_id ? `, ${this.store.etiqueta(e.serenazgo_id)}` : '');
        L.marker(g.aLatLng(e.x, e.y), {
          icon: iconoEvento(e.prioridad, {
            sel: e.id === sel, sinCobertura: e.estado === 'sin_cobertura', cancelado: e.estado === 'cancelado',
            opacidad: e.estado === 'atendido' ? 0.3 : e.programado ? 0.7 : 1, orden: orden.get(e.id) }),
          title: desc, alt: desc, zIndexOffset: e.id === sel || orden.has(e.id) ? 800 : 0,
        }).bindTooltip(`#${e.id} · ${e.tipologia} · ${e.estado}`, { direction: 'top', offset: [0, -10] })
          .on('click', () => { if (!this.store.modoAgregar()) this.store.seleccionarEvento(e.id); })
          .addTo(this.eventos);
      });
    });

    // serenazgos (posición actual)
    effect(() => {
      const v = this.store.vista(), g = this.geo(), sel = this.store.sel();
      if (!this.listo() || !v || !g) return;
      this.unidades.clearLayers();
      v.serenazgos.forEach((s) => {
        const es = s.id === sel;
        L.circleMarker(g.aLatLng(s.x, s.y), {
          radius: es ? 9 : 5, color: es ? '#17254B' : '#fff', weight: es ? 3 : 1.5,
          fillColor: COLOR_ESTADO[s.estado], fillOpacity: 1, bubblingMouseEvents: false,
        }).bindTooltip(`${s.etiqueta} · ${s.estado}${s.eventos.length ? ' · eventos ' + s.eventos.join(', ') : ''}`)
          .on('click', () => { if (!this.store.modoAgregar()) this.store.seleccionarSerenazgo(es ? null : s.id); })
          .addTo(this.unidades);
      });
    });

    // recorrido del seleccionado, líneas entre sus eventos y redistribución
    effect(() => {
      const g = this.geo(), ser = this.store.serenazgoSel(), ruta = this.store.ruta(), R = this.store.redistribucion();
      if (!this.listo() || !g) return;
      this.lineas.clearLayers();
      if (ruta.length > 1) {
        const pts = ruta.map(([x, y]) => g.aLatLng(x, y));
        L.polyline(pts, { color: '#fff', weight: 8, opacity: 0.9, interactive: false }).addTo(this.lineas);
        L.polyline(pts, { color: '#17254B', weight: 4, interactive: false }).addTo(this.lineas);
      }
      const pe = (ser?.tareas ?? []).filter((t) => t.tipo === 'evento').map((t) => g.aLatLng(t.x, t.y));
      if (pe.length > 1) L.polyline(pe, { color: '#2F5597', weight: 2, dashArray: '4 5', opacity: 0.8, interactive: false }).addTo(this.lineas);
      R?.movimientos.forEach((m) => L.polyline([g.aLatLng(m.desde[0], m.desde[1]), g.aLatLng(m.hacia[0], m.hacia[1])],
        { color: '#2F5597', weight: 1.5, dashArray: '3 4', opacity: 0.6, interactive: false }).addTo(this.lineas));
    });

    effect(() => {
      this.host().nativeElement.classList.toggle('modo-ubicar-mapa', this.store.modoAgregar());
    });
  }

  /** Serenazgos que tiene a cargo la base y su trabajo en el turno (se calcula al abrir el popup). */
  private infoBase(id: number, nombre: string): string {
    const v = this.store.vista();
    const ser = (v?.serenazgos ?? []).filter((s) => s.id_base === id);
    const ids = new Set(ser.map((s) => s.id));
    const cuenta = (e: string) => ser.filter((s) => s.estado === e).length;
    const ev = (v?.eventos ?? []).filter((e) => e.serenazgo_id != null && ids.has(e.serenazgo_id));
    const n = (f: (x: string) => boolean) => ev.filter((e) => f(e.estado)).length;
    return popupBase(nombre, ser.length, [
      ['Libres', cuenta('libre')], ['En camino', cuenta('en_camino')], ['Atendiendo', cuenta('atendiendo')],
      ['Fuera de servicio', cuenta('baja')],
      ['Eventos atendidos', n((x) => x === 'atendido')],
      ['Eventos en curso / por salir', n((x) => x !== 'atendido' && x !== 'cancelado')],
    ], resumenPorTipo(ser.map((s) => s.tipo)));
  }

  centrar(): void {
    const g = this.geo();
    if (this.map && g) encuadrar(this.map, g);
  }

  ngOnDestroy(): void { this.map?.remove(); }
}
