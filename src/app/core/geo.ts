import { Limites } from './models';

/**
 * Centro del área de operación, en tierra firme de Ventanilla (Callao), tierra adentro de la costa.
 * El plano simulado (8 × 5 km) queda entre lat -11.8375 y -11.8825 y lng -77.1368 y -77.0633,
 * con ≈2 km de margen respecto al mar en el punto más cercano.
 */
export const CENTRO_VENTANILLA: [number, number] = [-11.86, -77.1];
const KM_POR_GRADO = 111.32;

/**
 * Línea de costa real de Ventanilla, de sur a norte [lat, lng]: puntos de playa a nivel del mar
 * (OEFA: playas Ventanilla, Costa Azul y Los Delfines; MINSA/DIGESA: Costa Azul, Bahía Blanca, Hondable).
 * El mar queda al oeste de esta línea.
 */
export const COSTA: [number, number][] = [
  [-11.9347, -77.1399], [-11.9214, -77.1421], [-11.9058, -77.1459], [-11.8771, -77.1574],
  [-11.8726, -77.159], [-11.8452, -77.1761], [-11.8355, -77.1847], [-11.8135, -77.1771],
];

/** Longitud de la costa a esa latitud (interpolación lineal entre los puntos de playa). */
export function costaLng(lat: number): number {
  if (lat <= COSTA[0][0]) return COSTA[0][1];
  for (let i = 1; i < COSTA.length; i++) {
    const [la0, lo0] = COSTA[i - 1], [la1, lo1] = COSTA[i];
    if (lat <= la1) return lo0 + (lat - la0) / (la1 - la0) * (lo1 - lo0);
  }
  return COSTA[COSTA.length - 1][1];
}

export interface Geo {
  /** coordenadas del backend → [lat, lng] */
  aLatLng(x: number, y: number): [number, number];
  /** [lat, lng] → coordenadas del backend */
  aKm(lat: number, lng: number): [number, number];
  /** esquinas del área de trabajo [[sur, oeste], [norte, este]] */
  area: [[number, number], [number, number]];
  /** true si el backend ya entrega coordenadas geográficas (red real OSMnx) */
  real: boolean;
  /** true si el punto está en tierra firme (al menos `margenKm` tierra adentro de la costa) */
  enTierra(lat: number, lng: number, margenKm?: number): boolean;
  /** true si el punto está dentro del área de operación */
  dentro(lat: number, lng: number): boolean;
}

/**
 * Convierte las coordenadas del backend a mapa.
 * - Red simulada: el plano está en km; se ancla al centro de Ventanilla.
 * - Red real (OSMnx): x = longitud, y = -latitud; se usa tal cual.
 */
export function crearGeo(L: Limites): Geo {
  const real = L.xmax - L.xmin < 1 && L.ymax - L.ymin < 1;
  if (real) {
    const area: [[number, number], [number, number]] = [[-L.ymax, L.xmin], [-L.ymin, L.xmax]];
    return {
      real,
      aLatLng: (x, y) => [-y, x],
      aKm: (lat, lng) => [lng, -lat],
      area,
      enTierra: () => true,                           // la red real de OSMnx solo tiene calles (tierra)
      dentro: (lat, lng) => lat >= area[0][0] && lat <= area[1][0] && lng >= area[0][1] && lng <= area[1][1],
    };
  }
  const cx = (L.xmin + L.xmax) / 2, cy = (L.ymin + L.ymax) / 2;
  const [lat0, lng0] = CENTRO_VENTANILLA;
  const kmLng = KM_POR_GRADO * Math.cos(Math.abs(lat0) * Math.PI / 180);
  const aLatLng = (x: number, y: number): [number, number] =>
    [lat0 - (y - cy) / KM_POR_GRADO, lng0 + (x - cx) / kmLng];
  const sw = aLatLng(L.xmin, L.ymax), ne = aLatLng(L.xmax, L.ymin);
  return {
    real, aLatLng, area: [sw, ne],
    aKm: (lat, lng) => [cx + (lng - lng0) * kmLng, cy - (lat - lat0) * KM_POR_GRADO],
    enTierra: (lat, lng, margenKm = 0.5) => lng >= costaLng(lat) + margenKm / kmLng,
    dentro: (lat, lng) => lat >= sw[0] && lat <= ne[0] && lng >= sw[1] && lng <= ne[1],
  };
}
