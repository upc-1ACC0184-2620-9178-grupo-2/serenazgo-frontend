import { Limites } from './models';

/** Centro de Ventanilla, Callao (Perú). */
export const CENTRO_VENTANILLA: [number, number] = [-11.875, -77.13];
const KM_POR_GRADO = 111.32;

export interface Geo {
  /** coordenadas del backend → [lat, lng] */
  aLatLng(x: number, y: number): [number, number];
  /** [lat, lng] → coordenadas del backend */
  aKm(lat: number, lng: number): [number, number];
  /** esquinas del área de trabajo [[sur, oeste], [norte, este]] */
  area: [[number, number], [number, number]];
  /** true si el backend ya entrega coordenadas geográficas (red real OSMnx) */
  real: boolean;
}

/**
 * Convierte las coordenadas del backend a mapa.
 * - Red simulada: el plano está en km; se ancla al centro de Ventanilla.
 * - Red real (OSMnx): x = longitud, y = -latitud; se usa tal cual.
 */
export function crearGeo(L: Limites): Geo {
  const real = L.xmax - L.xmin < 1 && L.ymax - L.ymin < 1;
  if (real) {
    const g: Geo = {
      real,
      aLatLng: (x, y) => [-y, x],
      aKm: (lat, lng) => [lng, -lat],
      area: [[-L.ymax, L.xmin], [-L.ymin, L.xmax]],
    };
    return g;
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
  };
}
