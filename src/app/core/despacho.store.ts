import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { ToastService } from './toast.service';
import {
  Asignacion, AsignacionEfectiva, AsignacionItem, Estado, Incidente, NuevoIncidente,
  PRIORIDAD, Red,
} from './models';

/** Estado de la pantalla de despacho (signals). Toda la lógica de pantalla vive aquí. */
@Injectable({ providedIn: 'root' })
export class DespachoStore {
  private api = inject(ApiService);
  readonly toast = inject(ToastService);

  readonly red = signal<Red | null>(null);
  readonly estado = signal<Estado | null>(null);
  readonly asig = signal<Asignacion | null>(null);
  readonly sel = signal<string | null>(null);
  readonly over = signal<Record<string, number>>({});   // incidente -> unidad elegida por el operador
  readonly orden = signal<'prioridad' | 'recientes'>('prioridad');
  readonly q = signal('');
  readonly ubicando = signal(false);
  readonly punto = signal<{ x: number; y: number } | null>(null);
  readonly dialogoInc = signal(false);
  readonly errorCarga = signal<string | null>(null);

  // ---- derivados -------------------------------------------------------
  readonly incidentes = computed(() => this.estado()?.incidentes ?? []);
  readonly asignaciones = computed<AsignacionEfectiva[]>(() => {
    const a = this.asig(), o = this.over();
    if (!a) return [];
    return a.asignaciones.map((x) => {
      const alt = o[x.incidente_id] ? x.alternativas.find((y) => y.unidad_id === o[x.incidente_id]) : undefined;
      return alt ? { ...x, ...alt, modificada: true } : { ...x, modificada: false };
    });
  });
  readonly asigPorId = computed(() => new Map(this.asignaciones().map((a) => [a.incidente_id, a])));
  readonly sinCobPorId = computed(() => new Map((this.asig()?.sin_cobertura ?? []).map((c) => [c.incidente_id, c])));
  readonly seleccionado = computed<Incidente | null>(() => this.incidentes().find((i) => i.id_caso === this.sel()) ?? null);
  readonly asigSel = computed<AsignacionEfectiva | null>(() => this.asigPorId().get(this.sel() ?? '') ?? null);
  readonly baseSel = computed<AsignacionItem | null>(() => this.asig()?.asignaciones.find((a) => a.incidente_id === this.sel()) ?? null);
  readonly tiempoMedio = computed(() => {
    const l = this.asignaciones();
    return l.length ? l.reduce((s, a) => s + a.tiempo, 0) / l.length : 0;
  });
  readonly lista = computed(() => {
    const q = this.q().trim().toLowerCase(), map = this.asigPorId();
    let l = [...this.incidentes()];
    if (q) {
      l = l.filter((i) => {
        const e = map.get(i.id_caso);
        return [i.id_caso, i.tipologia, i.direccion, e?.unidad, e?.base].join(' ').toLowerCase().includes(q);
      });
    }
    if (this.orden() === 'recientes') return l.sort((a, b) => b.orden - a.orden);
    return l.sort((a, b) => PRIORIDAD[a.prioridad].orden - PRIORIDAD[b.prioridad].orden ||
      (map.get(a.id_caso)?.tiempo ?? 99) - (map.get(b.id_caso)?.tiempo ?? 99));
  });
  readonly proy = computed(() => {
    const r = this.red();
    if (!r) return null;
    const L = r.limites, W = 800, H = Math.round(W * (L.ymax - L.ymin) / (L.xmax - L.xmin));
    return {
      W, H,
      X: (x: number) => (x - L.xmin) / (L.xmax - L.xmin) * W,
      Y: (y: number) => (y - L.ymin) / (L.ymax - L.ymin) * H,
      ix: (px: number) => L.xmin + px / W * (L.xmax - L.xmin),
      iy: (py: number) => L.ymin + py / H * (L.ymax - L.ymin),
    };
  });
  readonly calles = computed(() => {
    const r = this.red(), P = this.proy();
    if (!r || !P) return '';
    return r.aristas.map(([a, b]) => {
      const p = r.nodos[a], q = r.nodos[b];
      return `M${P.X(p[0]).toFixed(1)} ${P.Y(p[1]).toFixed(1)}L${P.X(q[0]).toFixed(1)} ${P.Y(q[1]).toFixed(1)}`;
    }).join('');
  });

  // ---- carga -------------------------------------------------------------
  async iniciar(): Promise<void> {
    try {
      await this.cargarRed();
      await this.refrescar();
      this.errorCarga.set(null);
    } catch (e) {
      this.errorCarga.set(this.mensaje(e));
    }
  }
  async cargarRed(): Promise<void> {
    this.red.set(await firstValueFrom(this.api.red()));
  }
  async refrescar(): Promise<void> {
    const [estado, asig] = await Promise.all([
      firstValueFrom(this.api.estado()), firstValueFrom(this.api.asignacion())]);
    this.estado.set(estado);
    this.asig.set(asig);
    this.over.set({});
    const s = this.sel();
    if (!s || !estado.incidentes.some((i) => i.id_caso === s)) this.sel.set(this.lista()[0]?.id_caso ?? null);
  }
  private mensaje(e: unknown): string {
    const err = e as { error?: { detail?: unknown }; message?: string; status?: number };
    if (err?.status === 0) return 'No hay conexión con el backend. ¿Está corriendo en ' + 'el puerto 8000?';
    const d = err?.error?.detail;
    return typeof d === 'string' ? d : (err?.message ?? 'Error inesperado.');
  }
  private async intentar(fn: () => Promise<void>): Promise<void> {
    try { await fn(); } catch (e) { this.toast.mostrar(this.mensaje(e), true); }
  }

  // ---- acciones ----------------------------------------------------------
  seleccionar(id: string): void { this.sel.set(id); }

  cambiarUnidad(uid: number): void {
    const b = this.baseSel();
    if (!b) return;
    this.over.update((o) => {
      const n = { ...o };
      if (uid === b.unidad_id) delete n[b.incidente_id]; else n[b.incidente_id] = uid;
      return n;
    });
  }

  confirmar(ids?: string[]): Promise<void> {
    return this.intentar(async () => {
      const pares = this.asignaciones().filter((a) => !ids || ids.includes(a.incidente_id))
        .map((a) => ({ incidente_id: a.incidente_id, unidad_id: a.unidad_id, tiempo: a.tiempo, modificada: a.modificada }));
      if (!pares.length) { this.toast.mostrar('No hay asignaciones por confirmar.', true); return; }
      const r = await firstValueFrom(this.api.confirmar(pares));
      this.toast.mostrar(`${r.confirmadas} asignación(es) confirmada(s).`);
      await this.refrescar();
    });
  }
  escalar(): Promise<void> {
    return this.intentar(async () => {
      const ids = (this.asig()?.sin_cobertura ?? []).map((c) => c.incidente_id);
      const r = await firstValueFrom(this.api.escalar(ids));
      this.toast.mostrar(`${r.escalados} incidente(s) escalado(s) al supervisor.`);
    });
  }
  nuevoCiclo(): Promise<void> {
    return this.intentar(async () => {
      await firstValueFrom(this.api.nuevoCiclo());
      this.sel.set(null);
      await this.refrescar();
      this.toast.mostrar('Nuevo ciclo generado.');
    });
  }
  bloquearTramoDeRuta(): Promise<void> {
    return this.intentar(async () => {
      const a = this.asigSel(), r = this.red();
      if (!a || !r || a.ruta.length < 3) { this.toast.mostrar('Selecciona un incidente con ruta asignada.', true); return; }
      const k = Math.floor(a.ruta.length / 2);
      const idx = (c: number[]) => r.nodos.findIndex((n) => Math.abs(n[0] - c[0]) < 1e-6 && Math.abs(n[1] - c[1]) < 1e-6);
      const u = idx(a.ruta[k - 1]), v = idx(a.ruta[k]);
      if (u < 0 || v < 0) { this.toast.mostrar('Ese tramo no se puede bloquear.', true); return; }
      await firstValueFrom(this.api.bloquearTramo(u, v));
      await this.cargarRed();
      await this.refrescar();
      this.toast.mostrar('Tramo bloqueado: tiempos y asignación recalculados.');
    });
  }
  restablecerRed(): Promise<void> {
    return this.intentar(async () => {
      await firstValueFrom(this.api.restablecerRed());
      await this.cargarRed();
      await this.refrescar();
      this.toast.mostrar('Red restablecida.');
    });
  }
  setUnidad(id: number, disponible: boolean): Promise<void> {
    return this.intentar(async () => {
      await firstValueFrom(this.api.actualizarUnidad(id, disponible));
      await this.refrescar();
    });
  }
  async registrarIncidente(d: NuevoIncidente): Promise<Incidente> {
    const inc = await firstValueFrom(this.api.registrarIncidente(d));
    this.punto.set(null);
    this.sel.set(inc.id_caso);
    await this.cargarRed();
    await this.refrescar();
    this.toast.mostrar(`Incidente #${inc.id_caso} registrado.`);
    return inc;
  }
  puntoDesdeMapa(x: number, y: number): void {
    this.punto.set({ x: +x.toFixed(2), y: +y.toFixed(2) });
    this.ubicando.set(false);
    this.dialogoInc.set(true);
  }
  errorDe(e: unknown): string { return this.mensaje(e); }
}
