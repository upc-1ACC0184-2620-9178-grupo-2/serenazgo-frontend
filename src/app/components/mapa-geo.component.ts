import { Component, ElementRef, OnDestroy, computed, effect, inject, signal, viewChild } from '@angular/core';
import * as L from 'leaflet';
import { DespachoStore } from '../core/despacho.store';
import { crearGeo } from '../core/geo';
import { MinutosPipe } from '../core/minutos.pipe';
import { PRIORIDAD } from '../core/models';
import { crearMapa, encuadrar, iconoBase, iconoEtiqueta, iconoEvento, popupBase, resumenPorTipo } from './mapa-base';

/** Mapa de la pantalla de despacho sobre OpenStreetMap, limitado a Ventanilla. */
@Component({
  selector: 'app-mapa-geo',
  template: `<div #host class="mapa-geo" role="application"
       aria-label="Mapa de Ventanilla con incidentes, bases y rutas recomendadas. Arrastra para mover y usa la rueda para acercar."></div>
     <button class="btn mini centrar" type="button" (click)="centrar()" aria-label="Volver a encuadrar Ventanilla">Centrar</button>`,
})
export class MapaGeoComponent implements OnDestroy {
  store = inject(DespachoStore);
  private host = viewChild.required<ElementRef<HTMLElement>>('host');
  private min = new MinutosPipe();
  private map?: L.Map;
  private calles = L.layerGroup();
  private bases = L.layerGroup();
  private rutas = L.layerGroup();
  private eventos = L.layerGroup();
  private extra = L.layerGroup();
  private listo = signal(false);

  geo = computed(() => { const r = this.store.red(); return r ? crearGeo(r.limites) : null; });

  constructor() {
    // crea el mapa cuando hay red vial
    effect(() => {
      const g = this.geo();
      if (!g || this.map) return;
      const map = this.map = crearMapa(this.host().nativeElement, g);
      [this.calles, this.rutas, this.bases, this.eventos, this.extra].forEach((l) => l.addTo(map));
      L.control.layers(undefined, { 'Red vial simulada': this.calles }, { collapsed: true, position: 'topright' }).addTo(map);
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (!this.store.ubicando()) return;
        const [x, y] = g.aKm(e.latlng.lat, e.latlng.lng);
        this.store.puntoDesdeMapa(x, y);
      });
      this.listo.set(true);
    });

    // red vial y bases
    effect(() => {
      const r = this.store.red(), g = this.geo();
      if (!this.listo() || !r || !g) return;
      this.calles.clearLayers();
      const segs = r.aristas.map(([a, b]) => [g.aLatLng(r.nodos[a][0], r.nodos[a][1]), g.aLatLng(r.nodos[b][0], r.nodos[b][1])] as L.LatLngTuple[]);
      L.polyline(segs, { color: '#2F5597', weight: 1, opacity: 0.35, interactive: false }).addTo(this.calles);
      r.bloqueados.forEach(([a, b]) => L.polyline(
        [g.aLatLng(r.nodos[a][0], r.nodos[a][1]), g.aLatLng(r.nodos[b][0], r.nodos[b][1])],
        { color: '#C62839', weight: 5, dashArray: '4 4' }).bindTooltip('Tramo bloqueado').addTo(this.calles));
      this.bases.clearLayers();
      r.bases.forEach((b) => L.marker(g.aLatLng(b.x, b.y), { icon: iconoBase(), title: b.nombre, zIndexOffset: 500 })
        .bindTooltip(b.nombre + ' · clic para ver sus unidades', { direction: 'bottom', offset: [0, 10] })
        .bindPopup(() => this.infoBase(b.id, b.nombre)).addTo(this.bases));
    });

    // incidentes y rutas
    effect(() => {
      const g = this.geo(), sel = this.store.sel();
      const incs = this.store.incidentes(), asg = this.store.asignaciones(), sc = this.store.sinCobPorId();
      if (!this.listo() || !g) return;
      this.rutas.clearLayers();
      asg.filter((a) => a.incidente_id !== sel).forEach((a) => L.polyline(a.ruta.map(([x, y]) => g.aLatLng(x, y)),
        { color: '#2F5597', weight: 2, opacity: 0.6, dashArray: '2 6', interactive: false }).addTo(this.rutas));
      const a = this.store.asigSel();
      if (a && a.ruta.length > 1) {
        const pts = a.ruta.map(([x, y]) => g.aLatLng(x, y));
        L.polyline(pts, { color: '#fff', weight: 8, opacity: 0.9, interactive: false }).addTo(this.rutas);
        L.polyline(pts, { color: '#17254B', weight: 4, interactive: false }).addTo(this.rutas);
        L.marker(pts[Math.floor(pts.length / 2)], { icon: iconoEtiqueta(`${this.min.transform(a.tiempo)} · ${a.unidad}`), interactive: false }).addTo(this.rutas);
      }
      this.eventos.clearLayers();
      incs.forEach((i) => {
        const e = this.store.asigPorId().get(i.id_caso);
        const desc = `Incidente ${i.id_caso}, prioridad ${PRIORIDAD[i.prioridad].nombre}, ${i.tipologia}. ` +
          (e ? `Unidad ${e.unidad}, ${this.min.transform(e.tiempo)}.` : 'Sin cobertura.');
        L.marker(g.aLatLng(i.x, i.y), {
          icon: iconoEvento(i.prioridad, { sel: i.id_caso === sel, sinCobertura: sc.has(i.id_caso) }),
          title: desc, alt: desc, zIndexOffset: i.id_caso === sel ? 1000 : 0,
        }).bindTooltip(`#${i.id_caso} · ${i.tipologia}`, { direction: 'top', offset: [0, -10] })
          .on('click', () => { if (!this.store.ubicando()) this.store.seleccionar(i.id_caso); })
          .addTo(this.eventos);
      });
    });

    // punto elegido para un incidente nuevo + cursor
    effect(() => {
      const g = this.geo(), p = this.store.punto(), ubicando = this.store.ubicando();
      if (!this.listo() || !g) return;
      this.extra.clearLayers();
      if (p) L.circleMarker(g.aLatLng(p.x, p.y), { radius: 12, color: '#17254B', weight: 3, dashArray: '4 3', fillOpacity: 0.1 }).addTo(this.extra);
      this.host().nativeElement.classList.toggle('modo-ubicar-mapa', ubicando);
    });
  }

  /** Unidades que tiene a cargo la base (se calcula al abrir el popup, siempre actualizado). */
  private infoBase(id: number, nombre: string): string {
    const unidades = (this.store.estado()?.unidades ?? []).filter((u) => u.id_base === id);
    const libres = unidades.filter((u) => u.disponible).length;
    const asignaciones = this.store.asig()?.por_base.find((b) => b.id === id)?.asignaciones ?? 0;
    return popupBase(nombre, unidades.length, [
      ['Libres', libres], ['Ocupadas', unidades.length - libres], ['Asignaciones recomendadas', asignaciones],
    ], resumenPorTipo(unidades.map((u) => u.tipo)));
  }

  centrar(): void {
    const g = this.geo();
    if (this.map && g) encuadrar(this.map, g);
  }

  ngOnDestroy(): void { this.map?.remove(); }
}
