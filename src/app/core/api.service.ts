import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  Asignacion, Cambio, Comparacion, Decision, Estado, Incidente, NuevoEscenario, NuevoIncidente,
  ParConfirmacion, PlanMetricas, PlanVista, Red, Redistribucion, ResultadoSi, Unidad, Prioridad,
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

  // ---- Plan de turno ----
  plan = () => this.http.get<PlanVista>(this.url('/api/plan'));
  planEscenario = (b: NuevoEscenario) => this.http.post<PlanVista>(this.url('/api/plan/escenario'), b);
  planReloj = (minutos: number) =>
    this.http.post<{ hora: string; ahora_min: number; reasignados: Cambio[] }>(this.url('/api/plan/reloj'), { minutos });
  planEvento = (d: { tipologia: string; direccion: string; prioridad: Prioridad; x: number; y: number }) =>
    this.http.post<{ evento_id: number; serenazgo_id: number | null; asignado: boolean }>(this.url('/api/plan/eventos'), d);
  planCancelar = (id: number) =>
    this.http.post<{ evento_id: number; reasignados: Cambio[] }>(this.url(`/api/plan/eventos/${id}/cancelar`), {});
  planBaja = (id: number) =>
    this.http.post<{ serenazgo_id: number; reasignados: Cambio[] }>(this.url(`/api/plan/serenazgos/${id}/baja`), {});
  planRuta = (id: number) =>
    this.http.get<{ serenazgo_id: number; ruta: number[][] }>(this.url(`/api/plan/serenazgos/${id}/ruta`));
  planOptimizar = () =>
    this.http.post<{ mejoras: number; antes: PlanMetricas; despues: PlanMetricas; reasignados: Cambio[] }>(this.url('/api/plan/optimizar'), {});
  planEstrategia = (nombre: string) =>
    this.http.post<{ antes: PlanMetricas; despues: PlanMetricas; reasignados: Cambio[] }>(this.url('/api/plan/estrategia'), { nombre });
  planComparar = () => this.http.get<Record<string, Comparacion>>(this.url('/api/plan/estrategias/comparar'));
  planRedistribuir = () => this.http.post<Redistribucion>(this.url('/api/plan/redistribuir'), {});
  planQueSi = (b: { tipo: 'cancelar_evento' | 'baja_serenazgo'; evento_id?: number; serenazgo_id?: number }) =>
    this.http.post<ResultadoSi>(this.url('/api/plan/que-pasa-si'), b);
}
