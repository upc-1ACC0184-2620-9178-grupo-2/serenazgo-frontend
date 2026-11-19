import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  Asignacion, Decision, Estado, Incidente, NuevoIncidente, ParConfirmacion, Red, Unidad,
} from './models';

/** Cliente HTTP del backend Python (FastAPI). Una función por endpoint. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private url = (ruta: string) => environment.apiUrl + ruta;

  red = () => this.http.get<Red>(this.url('/api/red'));
  estado = () => this.http.get<Estado>(this.url('/api/estado'));
  asignacion = () => this.http.get<Asignacion>(this.url('/api/asignacion'));
  decisiones = () => this.http.get<Decision[]>(this.url('/api/decisiones'));

  confirmar = (pares: ParConfirmacion[]) =>
    this.http.post<{ confirmadas: number }>(this.url('/api/asignacion/confirmar'), { pares });
  escalar = (incidentes: string[]) =>
    this.http.post<{ escalados: number }>(this.url('/api/escalar'), { incidentes });
  nuevoCiclo = () => this.http.post<{ ciclo: number }>(this.url('/api/ciclo/nuevo'), {});
  registrarIncidente = (d: NuevoIncidente) =>
    this.http.post<Incidente>(this.url('/api/incidentes'), d);
  actualizarUnidad = (id: number, disponible: boolean) =>
    this.http.patch<Unidad>(this.url(`/api/unidades/${id}`), { disponible });
  bloquearTramo = (desde: number, hasta: number) =>
    this.http.post<{ bloqueados: number }>(this.url('/api/red/bloqueo'), { desde, hasta });
  restablecerRed = () => this.http.delete<{ bloqueados: number }>(this.url('/api/red/bloqueo'));
}
