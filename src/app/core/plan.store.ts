import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { DespachoStore } from './despacho.store';
import {
  Cambio, Comparacion, PlanEvento, PlanSerenazgo, PlanVista, Prioridad, Redistribucion, ResultadoSi,
} from './models';
import { ToastService } from './toast.service';

export interface SimulacionPendiente { tipo: 'cancelar_evento' | 'baja_serenazgo'; evento_id?: number; serenazgo_id?: number }

/** Estado de la pantalla "Plan de turno" (signals). */
@Injectable({ providedIn: 'root' })
export class PlanStore {
  private api = inject(ApiService);
  readonly base = inject(DespachoStore);
  readonly toast = inject(ToastService);

  readonly vista = signal<PlanVista | null>(null);
  readonly cargando = signal(false);
  readonly sel = signal<number | null>(null);               // serenazgo seleccionado
  readonly selEvento = signal<number | null>(null);
  readonly ruta = signal<number[][]>([]);                   // recorrido por calles del serenazgo seleccionado
  readonly redistribucion = signal<Redistribucion | null>(null);
  readonly simulacion = signal<{ r: ResultadoSi; aplicar: SimulacionPendiente } | null>(null);
  readonly comparacion = signal<Record<string, Comparacion> | null>(null);
  readonly cambios = signal<{ titulo: string; lista: Cambio[] } | null>(null);
  readonly modoAgregar = signal(false);
  readonly prioridadNueva = signal<Prioridad>('A');
  readonly filtro = signal<string>('todos');
  readonly mostrarTodos = signal(false);
  readonly error = signal<string | null>(null);

  readonly eventosPorId = computed(() => new Map((this.vista()?.eventos ?? []).map((e) => [e.id, e])));
  readonly serenazgosPorId = computed(() => new Map((this.vista()?.serenazgos ?? []).map((s) => [s.id, s])));
  readonly serenazgoSel = computed<PlanSerenazgo | null>(() => this.serenazgosPorId().get(this.sel() ?? -1) ?? null);
  readonly eventoSel = computed<PlanEvento | null>(() => this.eventosPorId().get(this.selEvento() ?? -1) ?? null);
  readonly agenda = computed(() => [...(this.vista()?.serenazgos ?? [])].sort((a, b) =>
    b.eventos.length - a.eventos.length || a.id - b.id));
  readonly eventosFiltrados = computed(() => {
    const f = this.filtro();
    return (this.vista()?.eventos ?? []).filter((e) => f === 'todos' || e.estado === f);
  });

  hora(minutos: number): string {
    const v = this.vista();
    if (!v) return '';
    const total = Math.round(+v.turno.inicio.slice(11, 13) * 60 + +v.turno.inicio.slice(14, 16) + minutos);
    const h = Math.floor(total / 60) % 24, m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  etiqueta(sid: number | null): string {
    return sid == null ? 'sin unidad' : (this.serenazgosPorId().get(sid)?.etiqueta ?? `#${sid}`);
  }

  private msg(e: unknown): string {
    const err = e as { error?: { detail?: unknown }; message?: string; status?: number };
    if (err?.status === 0) return 'No hay conexión con el backend.';
    const d = err?.error?.detail;
    return typeof d === 'string' ? d : (err?.message ?? 'Error inesperado.');
  }
  private async tarea(fn: () => Promise<void>): Promise<void> {
    this.cargando.set(true);
    try { await fn(); this.error.set(null); }
    catch (e) { this.error.set(this.msg(e)); this.toast.mostrar(this.msg(e), true); }
    finally { this.cargando.set(false); }
  }

  async cargar(): Promise<void> {
    await this.tarea(async () => {
      if (!this.base.red()) await this.base.cargarRed();
      await this.refrescar();
    });
  }
  async refrescar(): Promise<void> {
    this.vista.set(await firstValueFrom(this.api.plan()));
    const s = this.sel();
    if (s != null && this.serenazgosPorId().has(s)) await this.cargarRuta(s); else this.ruta.set([]);
  }
  private async cargarRuta(sid: number): Promise<void> {
    this.ruta.set((await firstValueFrom(this.api.planRuta(sid))).ruta);
  }
  private mostrarCambios(titulo: string, lista: Cambio[]): void {
    this.cambios.set({ titulo, lista });
    this.toast.mostrar(`${titulo} · reasignados: ${lista.length}`);
  }

  seleccionarSerenazgo(id: number | null): void {
    this.sel.set(id);
    if (id == null) { this.ruta.set([]); return; }
    this.tarea(() => this.cargarRuta(id));
  }
  seleccionarEvento(id: number | null): void { this.selEvento.set(id); }

  nuevoEscenario(n_serenazgos: number, n_eventos: number, pct: number): Promise<void> {
    return this.tarea(async () => {
      this.vista.set(await firstValueFrom(this.api.planEscenario({
        n_serenazgos, n_eventos, pct_programados: pct / 100, semilla: Math.floor(Math.random() * 1000) })));
      this.sel.set(null); this.ruta.set([]); this.simulacion.set(null); this.comparacion.set(null);
      this.redistribucion.set(null); this.cambios.set(null);
      this.toast.mostrar('Nuevo escenario generado.');
    });
  }
  avanzar(minutos: number): Promise<void> {
    return this.tarea(async () => {
      const r = await firstValueFrom(this.api.planReloj(minutos));
      await this.refrescar();
      this.mostrarCambios(`Reloj ${r.hora}`, r.reasignados);
    });
  }
  cancelarEvento(id: number): Promise<void> {
    return this.tarea(async () => {
      const r = await firstValueFrom(this.api.planCancelar(id));
      this.simulacion.set(null);
      await this.refrescar();
      this.mostrarCambios(`Evento ${id} cancelado`, r.reasignados);
    });
  }
  bajaSerenazgo(id: number): Promise<void> {
    return this.tarea(async () => {
      const r = await firstValueFrom(this.api.planBaja(id));
      this.simulacion.set(null);
      await this.refrescar();
      this.mostrarCambios(`${this.etiqueta(id)} fuera de servicio`, r.reasignados);
    });
  }
  optimizar(): Promise<void> {
    return this.tarea(async () => {
      const r = await firstValueFrom(this.api.planOptimizar());
      await this.refrescar();
      this.mostrarCambios(`Optimización (${r.mejoras} mejoras)`, r.reasignados);
    });
  }
  cambiarEstrategia(nombre: string): Promise<void> {
    return this.tarea(async () => {
      const r = await firstValueFrom(this.api.planEstrategia(nombre));
      await this.refrescar();
      this.mostrarCambios(`Estrategia ${nombre}`, r.reasignados);
    });
  }
  redistribuir(): Promise<void> {
    return this.tarea(async () => {
      const r = await firstValueFrom(this.api.planRedistribuir());
      this.redistribucion.set(r);
      await this.refrescar();
      this.toast.mostrar(`Redistribuidos ${r.movimientos.length} de ${r.libres} serenazgos libres.`);
    });
  }
  simular(a: SimulacionPendiente): Promise<void> {
    return this.tarea(async () => {
      this.simulacion.set({ r: await firstValueFrom(this.api.planQueSi(a)), aplicar: a });
    });
  }
  aplicarSimulacion(): Promise<void> {
    const s = this.simulacion();
    if (!s) return Promise.resolve();
    return s.aplicar.tipo === 'cancelar_evento' ? this.cancelarEvento(s.aplicar.evento_id!) : this.bajaSerenazgo(s.aplicar.serenazgo_id!);
  }
  comparar(): Promise<void> {
    return this.tarea(async () => { this.comparacion.set(await firstValueFrom(this.api.planComparar())); });
  }
  agregarEvento(x: number, y: number): Promise<void> {
    return this.tarea(async () => {
      const r = await firstValueFrom(this.api.planEvento({
        tipologia: 'Robo en vía pública', direccion: 'Reportado desde el mapa',
        prioridad: this.prioridadNueva(), x: +x.toFixed(3), y: +y.toFixed(3) }));
      this.modoAgregar.set(false);
      await this.refrescar();
      this.selEvento.set(r.evento_id);
      this.toast.mostrar(r.serenazgo_id ? `Evento ${r.evento_id} → ${this.etiqueta(r.serenazgo_id)}` : `Evento ${r.evento_id} sin cobertura`, !r.serenazgo_id);
    });
  }
}
