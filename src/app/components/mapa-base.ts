import * as L from 'leaflet';
import { Geo } from '../core/geo';

export const COLOR = { A: '#C62839', M: '#F2A71B', B: '#1F8F55' } as const;
export type Prio = keyof typeof COLOR;

/** Lima Metropolitana y Callao: el mapa se puede explorar libremente dentro de esta región. */
const LIMA = L.latLngBounds([-12.55, -77.25], [-11.55, -76.65]);

/**
 * Mapa tipo Google Maps (OpenStreetMap): arrastrar, zoom con rueda/doble clic/botones, escala.
 * Muestra toda Lima, pero arranca encuadrado en Ventanilla (zona de operación) y la resalta.
 */
export function crearMapa(el: HTMLElement, geo: Geo): L.Map {
  const [sw, ne] = geo.area;
  const area = L.latLngBounds(sw, ne);
  const map = L.map(el, {
    minZoom: 10, maxZoom: 19, zoomSnap: 0.5, zoomControl: true,
    maxBounds: LIMA, maxBoundsViscosity: 0.9, attributionControl: true,
  });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

  // enfoque: se atenúa todo lo que está fuera de la zona de operación de Ventanilla
  const fuera: L.LatLngTuple[] = [[-14, -79], [-14, -75], [-10, -75], [-10, -79]];
  const dentro: L.LatLngTuple[] = [[sw[0], sw[1]], [sw[0], ne[1]], [ne[0], ne[1]], [ne[0], sw[1]]];
  L.polygon([fuera, dentro], { stroke: false, fillColor: '#17254B', fillOpacity: 0.16, interactive: false }).addTo(map);
  L.rectangle(area, { color: '#17254B', weight: 2, dashArray: '6 6', fill: false, interactive: false }).addTo(map);
  L.marker([ne[0], (sw[1] + ne[1]) / 2], {
    interactive: false, keyboard: false,
    icon: L.divIcon({ className: 'ev-ico', iconSize: [0, 0], html: '<div class="zona-lbl">Zona de operación · Ventanilla</div>' }),
  }).addTo(map);

  map.fitBounds(area);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => map.invalidateSize()).observe(el);
  return map;
}

export function encuadrar(map: L.Map, geo: Geo): void {
  map.invalidateSize();
  map.fitBounds(L.latLngBounds(geo.area[0], geo.area[1]));
}

const forma = (p: Prio, cancelado = false): string => {
  if (cancelado) {
    return '<svg width="22" height="22" viewBox="0 0 16 16"><path d="M3 3L13 13M13 3L3 13" stroke="#6B7490" stroke-width="2.6" stroke-linecap="round"/></svg>';
  }
  const c = COLOR[p];
  const f = p === 'A' ? `<polygon points="8,1.5 15,14 1,14" fill="${c}" stroke="#fff" stroke-width="1.4"/>`
    : p === 'M' ? `<circle cx="8" cy="8" r="6.5" fill="${c}" stroke="#fff" stroke-width="1.4"/>`
    : `<rect x="2" y="2" width="12" height="12" rx="1.5" fill="${c}" stroke="#fff" stroke-width="1.4"/>`;
  return `<svg width="26" height="26" viewBox="0 0 16 16">${f}</svg>`;
};

export interface OpcionesIcono { sel?: boolean; sinCobertura?: boolean; cancelado?: boolean; opacidad?: number; orden?: number }

export function iconoEvento(p: Prio, o: OpcionesIcono = {}): L.DivIcon {
  const cls = ['ev', o.sel ? 'ev-sel' : '', o.sinCobertura ? 'ev-sc' : ''].join(' ');
  const n = o.orden ? `<b class="ev-n">${o.orden}</b>` : '';
  return L.divIcon({
    className: 'ev-ico', iconSize: [26, 26], iconAnchor: [13, 13],
    html: `<div class="${cls}" style="opacity:${o.opacidad ?? 1}">${forma(p, o.cancelado)}${n}</div>`,
  });
}

export function iconoBase(): L.DivIcon {
  return L.divIcon({ className: 'ev-ico', iconSize: [24, 24], iconAnchor: [12, 12], html: '<div class="base-ico">B</div>' });
}

export function iconoEtiqueta(texto: string): L.DivIcon {
  return L.divIcon({ className: 'ev-ico', iconSize: [0, 0], html: `<div class="ruta-lbl">${texto}</div>` });
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Cuenta elementos por tipo → "Camionetas 8 · Autos 6 · Motos 18". */
export function resumenPorTipo(tipos: string[]): string {
  const plural: Record<string, string> = { Camioneta: 'Camionetas', Auto: 'Autos', Moto: 'Motos', Bicicleta: 'Bicicletas' };
  const n = new Map<string, number>();
  tipos.forEach((t) => n.set(t, (n.get(t) ?? 0) + 1));
  return [...n].map(([t, c]) => `${plural[t] ?? t} ${c}`).join(' · ');
}

/** Contenido del popup de una base: cuántas unidades tiene a cargo. */
export function popupBase(nombre: string, total: number, filas: [string, number | string][], pie: string): string {
  return `<div class="pop"><h3>${esc(nombre)}</h3><p class="pop-big">${total} serenazgos a cargo</p>` +
    `<ul>${filas.map(([k, v]) => `<li><span>${esc(k)}</span><b>${esc(v)}</b></li>`).join('')}</ul>` +
    (pie ? `<p class="pop-sub">${esc(pie)}</p>` : '') + '</div>';
}
