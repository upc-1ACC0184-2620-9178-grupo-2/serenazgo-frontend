export type Prioridad = 'A' | 'M' | 'B';
export const PRIORIDAD: Record<Prioridad, { nombre: string; orden: number }> = {
  A: { nombre: 'Alta', orden: 0 },
  M: { nombre: 'Media', orden: 1 },
  B: { nombre: 'Baja', orden: 2 },
};

export interface Limites { xmin: number; xmax: number; ymin: number; ymax: number }
export interface BaseDto { id: number; nombre: string; x: number; y: number }
export interface Red {
  limites: Limites; nodos: number[][]; aristas: number[][]; bloqueados: number[][];
  bases: BaseDto[]; n_nodos: number; n_aristas: number;
}
export interface Incidente {
  id_caso: string; tipologia: string; direccion: string; prioridad: Prioridad;
  x: number; y: number; nodo_vial: number; estado: string; orden: number;
}
export interface Unidad {
  id: number; tipo: string; id_base: number; disponible: boolean;
  incidente_asignado: string | null; etiqueta: string;
}
export interface Estado {
  ciclo: number; hora: string; tmax: number; umbrales: number[]; tipologias: string[];
  incidentes: Incidente[]; unidades: Unidad[]; bases: BaseDto[];
}
export interface Alternativa {
  unidad_id: number; unidad: string; base_id: number; base: string;
  tiempo: number; ruta: number[][];
}
export interface AsignacionItem extends Alternativa {
  incidente_id: string; alternativas: Alternativa[];
}
export interface AsignacionEfectiva extends AsignacionItem { modificada: boolean }
export interface SinCobertura {
  incidente_id: string; motivo: 'fuera_de_alcance' | 'unidades_insuficientes';
}
export interface PorBase { id: number; nombre: string; total: number; libres: number; asignaciones: number }
export interface Metricas {
  incidentes_activos: number; atendibles: number; unidades_disponibles: number;
  unidades_total: number; tiempo_medio: number; flujo_maximo: number; tmax: number; calculo_ms: number;
}
export interface Asignacion {
  asignaciones: AsignacionItem[]; sin_cobertura: SinCobertura[]; por_base: PorBase[]; metricas: Metricas;
}
export interface Decision { ts: string; tipo: string; [k: string]: unknown }
export interface NuevoIncidente {
  tipologia: string; direccion: string; prioridad: Prioridad; x: number; y: number;
}
export interface ParConfirmacion {
  incidente_id: string; unidad_id: number; tiempo: number; modificada: boolean;
}
