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
  /** (lat, lng) del origen del plano en km; null si el backend ya entrega coordenadas geográficas */
  anclaje: [number, number] | null;
  /** contorno del distrito de Ventanilla en coordenadas del plano */
  distrito: number[][] | null;
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

// ---------------- Plan de turno ----------------
export interface PlanTarea {
  tipo: 'evento' | 'reposicion' | 'cancelada'; evento_id: number | null;
  salida: number; llegada: number; inicio: number; fin: number; retraso: number; x: number; y: number;
}
export type EstadoSerenazgo = 'libre' | 'en_camino' | 'atendiendo' | 'baja';
export interface PlanSerenazgo {
  id: number; etiqueta: string; tipo: string; id_base: number; en_servicio: boolean;
  estado: EstadoSerenazgo; x: number; y: number; eventos: number[]; carga_min: number;
  utilizacion_pct: number; tareas: PlanTarea[];
}
export type EstadoEvento = 'asignado' | 'en_camino' | 'atendiendo' | 'atendido' | 'cancelado' | 'sin_cobertura';
export interface PlanEvento {
  id: number; tipologia: string; direccion: string; prioridad: Prioridad; x: number; y: number;
  reportado_min: number; reportado_en: string; programado: boolean; duracion_min: number; plazo_min: number;
  estado: EstadoEvento; serenazgo_id: number | null; llegada: number | null; inicio: number | null;
  retraso: number | null; respuesta: number | null;
}
export interface PlanMetricas {
  eventos_reportados: number; programados: number; atendidos: number; en_curso: number; asignados: number;
  cancelados: number; sin_cobertura: number; retraso_total_min: number; respuesta_media_min: number;
  pct_en_plazo: number; serenazgos_usados: number; serenazgos_activos: number; carga_media_h: number;
  carga_max_h: number; carga_min_h: number; desviacion_carga_h: number; utilizacion_pct: number;
}
export interface PlanVista {
  turno: {
    inicio: string; fin: string; horas: number; duracion_min: number; ahora_min: number; ahora: string; hora: string;
    tiempo_real: boolean; velocidad: number; zona_horaria: string; eventos_por_hora: number;
  };
  estrategia: string; estrategias: { nombre: string; descripcion: string }[];
  serenazgos: PlanSerenazgo[]; eventos: PlanEvento[]; sin_cobertura: number[];
  bases: BaseDto[]; metricas: PlanMetricas;
}
export interface Cambio { evento_id: number; de: number | null; a: number | null }
export interface ResultadoSi {
  tipo: string; descripcion: string; antes: PlanMetricas; despues: PlanMetricas; reasignados: Cambio[];
}
export interface Redistribucion {
  libres: number; movimientos: { serenazgo_id: number; desde: number[]; hacia: number[]; minutos: number }[];
  cobertura_antes: number; cobertura_despues: number; tiempo_medio_antes: number; tiempo_medio_despues: number;
}
export type Comparacion = PlanMetricas & { descripcion: string };
export interface NuevoEscenario {
  n_serenazgos: number; n_eventos: number; pct_programados?: number; estrategia?: string; semilla?: number;
  tiempo_real: boolean; eventos_por_hora: number; velocidad?: number;
}
