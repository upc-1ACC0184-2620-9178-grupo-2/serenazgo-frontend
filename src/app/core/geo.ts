import { Red } from './models';

const KM_POR_GRADO = 111.32;

export interface Geo {
  /** coordenadas del backend → [lat, lng] */
  aLatLng(x: number, y: number): [number, number];
  /** [lat, lng] → coordenadas del backend */
  aKm(lat: number, lng: number): [number, number];
  /** esquinas del área de trabajo [[sur, oeste], [norte, este]] */
  area: [[number, number], [number, number]];
  /** contorno real del distrito de Ventanilla en [lat, lng] (null si no se conoce) */
  distrito: [number, number][] | null;
  /** true si el punto está dentro de Ventanilla (no en el mar ni en otro distrito) */
  dentro(lat: number, lng: number): boolean;
}

/** Punto en polígono (algoritmo del rayo). El polígono es [[lat, lng], ...]. */
function enPoligono(lat: number, lng: number, poli: [number, number][]): boolean {
  let dentro = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [la1, lo1] = poli[i], [la2, lo2] = poli[j];
    if ((la1 > lat) !== (la2 > lat) && lng < (lo2 - lo1) * (lat - la1) / (la2 - la1) + lo1) dentro = !dentro;
  }
  return dentro;
}

/**
 * Convierte las coordenadas del backend a mapa.
 * - Red simulada: el plano está en km (x este, y sur) con origen en `anclaje`, el centro del distrito de
 *   Ventanilla; la red, las bases y los eventos se generan solo dentro de su contorno oficial (IGN).
 * - Red real (OSMnx): x = longitud, y = -latitud; se usa tal cual.
 */
export function crearGeo(red: Red): Geo {
  const L = red.limites;
  if (!red.anclaje) {
    const area: [[number, number], [number, number]] = [[-L.ymax, L.xmin], [-L.ymin, L.xmax]];
    return {
      area, distrito: null,
      aLatLng: (x, y) => [-y, x],
      aKm: (lat, lng) => [lng, -lat],
      dentro: (lat, lng) => lat >= area[0][0] && lat <= area[1][0] && lng >= area[0][1] && lng <= area[1][1],
    };
  }
  const [lat0, lng0] = red.anclaje;
  const kmLng = KM_POR_GRADO * Math.cos(Math.abs(lat0) * Math.PI / 180);
  const aLatLng = (x: number, y: number): [number, number] => [lat0 - y / KM_POR_GRADO, lng0 + x / kmLng];
  const distrito = (red.distrito ?? []).map(([x, y]) => aLatLng(x, y));
  const sw = aLatLng(L.xmin, L.ymax), ne = aLatLng(L.xmax, L.ymin);
  return {
    aLatLng, distrito: distrito.length ? distrito : null, area: [sw, ne],
    aKm: (lat, lng) => [(lng - lng0) * kmLng, (lat0 - lat) * KM_POR_GRADO],
    dentro: (lat, lng) => (distrito.length ? enPoligono(lat, lng, distrito)
      : lat >= sw[0] && lat <= ne[0] && lng >= sw[1] && lng <= ne[1]),
  };
}
