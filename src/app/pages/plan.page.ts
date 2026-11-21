import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormaComponent } from '../components/forma.component';
import { PlanMapaGeoComponent } from '../components/plan-mapa-geo.component';
import { PlanTimelineComponent } from '../components/plan-timeline.component';
import { PlanStore } from '../core/plan.store';
import { PRIORIDAD } from '../core/models';

const ESTADOS = ['todos', 'asignado', 'en_camino', 'atendiendo', 'atendido', 'cancelado', 'sin_cobertura'];
const FILAS: [string, string][] = [
  ['retraso_total_min', 'Retraso total (min)'], ['respuesta_media_min', 'Respuesta media (min)'],
  ['pct_en_plazo', '% dentro del plazo'], ['sin_cobertura', 'Sin cobertura'],
  ['serenazgos_usados', 'Serenazgos usados'], ['carga_max_h', 'Carga máx. (h)'],
  ['carga_min_h', 'Carga mín. (h)'], ['desviacion_carga_h', 'Desviación de carga (h)'],
];

/** Plan de turno: el día de trabajo de todos los serenazgos, que cambia con cada evento. */
@Component({
  selector: 'app-plan-page',
  imports: [FormsModule, FormaComponent, PlanMapaGeoComponent, PlanTimelineComponent],
  template: `
  @if (store.vista(); as v) {
  <section class="vista plan" aria-label="Plan de turno">

    <!-- reloj y controles -->
    <article class="card plan-ctrl">
      <div class="reloj">
        <p class="eyebrow">Turno de {{ v.turno.horas }} horas · {{ v.turno.inicio.slice(0, 10) }}</p>
        <p class="hora" aria-label="Hora actual">{{ store.horaViva() || v.turno.hora }}</p>
        <p class="modo" [class.vivo]="v.turno.tiempo_real">{{ modo() }}</p>
        <div class="barra" role="progressbar" aria-label="Avance del turno" aria-valuemin="0" aria-valuemax="100"
             [attr.aria-valuenow]="avance()"><i [style.width.%]="avance()"></i></div>
        <p class="sub">{{ store.hora(0) }} → {{ store.hora(v.turno.duracion_min) }}</p>
      </div>
      <div class="plan-btns">
        @if (v.turno.tiempo_real) {
          <label class="lbl" for="vel">Velocidad del reloj</label>
          <div class="fila-btn">
            <select id="vel" [ngModel]="v.turno.velocidad" (ngModelChange)="store.cambiarVelocidad(+$event)">
              <option [ngValue]="1">Hora real (×1)</option><option [ngValue]="10">Demo ×10</option>
              <option [ngValue]="60">Demo ×60</option><option [ngValue]="300">Demo ×300</option>
            </select>
          </div>
          <p class="sub">El reloj sigue la hora de {{ v.turno.zona_horaria }}. Los accidentes y demás eventos llegan solos
            (≈{{ v.turno.eventos_por_hora }} por hora) y el plan se reasigna al instante.</p>
        } @else {
          <span class="lbl">Avanzar el reloj (simulación)</span>
          <div class="fila-btn">
            @for (m of [15, 30, 60, 120]; track m) {
              <button class="btn secundario" type="button" [disabled]="store.cargando()" (click)="store.avanzar(m)">+{{ m }} min</button>
            }
            <button class="btn secundario" type="button" [disabled]="store.cargando()" (click)="store.avanzar(resta())">Fin del turno</button>
          </div>
        }
      </div>
      <div class="plan-btns">
        <label class="lbl" for="estr">Estrategia</label>
        <div class="fila-btn">
          <select id="estr" [ngModel]="v.estrategia" (ngModelChange)="store.cambiarEstrategia($event)">
            @for (e of v.estrategias; track e.nombre) { <option [value]="e.nombre">{{ e.nombre }}</option> }
          </select>
          <button class="btn secundario" type="button" [disabled]="store.cargando()" (click)="store.comparar()">Comparar estrategias</button>
        </div>
        <p class="sub">{{ descripcion() }}</p>
      </div>
      <div class="plan-btns">
        <span class="lbl">Acciones</span>
        <div class="fila-btn">
          <button class="btn primario" type="button" [disabled]="store.cargando()" (click)="store.redistribuir()">Redistribuir libres</button>
          <button class="btn secundario" type="button" [disabled]="store.cargando()" (click)="store.optimizar()">Optimizar</button>
          <button class="btn secundario" type="button" [class.activo-btn]="store.modoAgregar()" (click)="store.modoAgregar.set(!store.modoAgregar())">
            {{ store.modoAgregar() ? 'Haz clic en el mapa…' : '+ Evento en el mapa' }}
          </button>
          <select aria-label="Prioridad del evento nuevo" [ngModel]="store.prioridadNueva()" (ngModelChange)="store.prioridadNueva.set($event)">
            <option value="A">Alta</option><option value="M">Media</option><option value="B">Baja</option>
          </select>
        </div>
      </div>
      <details class="plan-btns esc">
        <summary>Nuevo escenario</summary>
        <div class="fila-btn">
          <label class="chk"><input type="checkbox" [(ngModel)]="tiempoReal"> Tiempo real</label>
          <label>Serenazgos <input type="number" min="1" max="500" [(ngModel)]="nSer"></label>
          @if (tiempoReal) {
            <label>Eventos por hora <input type="number" min="0" max="600" [(ngModel)]="eph"></label>
          } @else {
            <label>Eventos <input type="number" min="0" max="1000" [(ngModel)]="nEv"></label>
            <label>% en agenda <input type="number" min="0" max="100" [(ngModel)]="pctProg"></label>
          }
          <button class="btn secundario" type="button" [disabled]="store.cargando()" (click)="store.nuevoEscenario(nSer, nEv, pctProg, tiempoReal, eph)">Generar</button>
        </div>
      </details>
    </article>

    <!-- indicadores -->
    <dl class="kpis plan-kpis">
      <div class="kpi"><b>{{ v.metricas.atendidos }}</b><span>Atendidos</span></div>
      <div class="kpi"><b>{{ v.metricas.en_curso }}</b><span>En curso</span></div>
      <div class="kpi"><b>{{ v.metricas.asignados }}</b><span>Asignados (por salir)</span></div>
      <div class="kpi"><b>{{ v.metricas.programados }}</b><span>Por llegar</span></div>
      <div class="kpi"><b>{{ v.metricas.cancelados }}</b><span>Cancelados</span></div>
      <div class="kpi" [class.alerta]="v.metricas.sin_cobertura > 0"><b>{{ v.metricas.sin_cobertura }}</b><span>Sin cobertura</span></div>
      <div class="kpi"><b>{{ v.metricas.pct_en_plazo }}%</b><span>Dentro del plazo</span></div>
      <div class="kpi"><b>{{ v.metricas.serenazgos_usados }} / {{ v.metricas.serenazgos_activos }}</b><span>Serenazgos con trabajo</span></div>
      <div class="kpi"><b>{{ v.metricas.carga_media_h }} h</b><span>Carga media (máx {{ v.metricas.carga_max_h }} h)</span></div>
    </dl>

    <article class="card actividad">
      <div class="card-cab"><h2>Actividad en vivo</h2><span class="cuenta">últimos eventos reportados</span></div>
      <ul class="act">
        @for (e of recientes(); track e.id) {
          <li><b>{{ store.hora(e.reportado_min) }}</b> <app-forma [p]="e.prioridad" [size]="14" /> {{ e.tipologia }}
            <span class="est" [class]="'est-' + e.estado">{{ e.estado }}</span>
            @if (e.serenazgo_id) { → {{ store.etiqueta(e.serenazgo_id) }} }</li>
        } @empty { <li>Aún no hay eventos en este turno.</li> }
      </ul>
    </article>

    <div class="plan-grid">
      <article class="card">
        <div class="card-cab"><h2>Mapa del turno</h2>
          <ul class="leyenda-plan" aria-label="Leyenda">
            <li><svg width="10" height="10"><circle cx="5" cy="5" r="4" class="u-libre"/></svg> libre</li>
            <li><svg width="10" height="10"><circle cx="5" cy="5" r="4" class="u-en_camino"/></svg> en camino</li>
            <li><svg width="10" height="10"><circle cx="5" cy="5" r="4" class="u-atendiendo"/></svg> atendiendo</li>
            <li><svg width="10" height="10"><circle cx="5" cy="5" r="4" class="u-baja"/></svg> baja</li>
          </ul>
        </div>
        <div class="mapa-caja" [class.modo-ubicar]="store.modoAgregar()"><app-plan-mapa-geo /></div>
        @if (store.redistribucion(); as r) {
          <p class="nota">Redistribución: {{ r.movimientos.length }} de {{ r.libres }} libres movidos · tiempo medio a la demanda
            {{ r.tiempo_medio_antes }} → <b>{{ r.tiempo_medio_despues }} min</b> · cobertura ≤10 min {{ r.cobertura_antes }}% → <b>{{ r.cobertura_despues }}%</b></p>
        }
        @if (store.cambios(); as c) {
          <details class="nota" open>
            <summary>{{ c.titulo }} · {{ c.lista.length }} reasignados</summary>
            <ul class="cambios">
              @for (x of c.lista.slice(0, 25); track x.evento_id) {
                <li>Evento {{ x.evento_id }}: {{ store.etiqueta(x.de) }} → <b>{{ store.etiqueta(x.a) }}</b></li>
              }
            </ul>
          </details>
        }
      </article>

      <article class="card agenda">
        <div class="card-cab"><h2>Agenda por serenazgo</h2><span class="cuenta">{{ v.serenazgos.length }} unidades</span></div>
        <ul class="lista">
          @for (s of store.agenda().slice(0, mostrarN()); track s.id) {
            <li>
              <button class="item ag" type="button" [attr.aria-current]="s.id === store.sel() ? 'true' : null"
                      (click)="store.seleccionarSerenazgo(store.sel() === s.id ? null : s.id)">
                <span class="punto" [class]="'u-' + s.estado" aria-hidden="true"></span>
                <span><span class="t1">{{ s.etiqueta }}</span><br>
                  <span class="t2">{{ s.eventos.length ? 'Eventos ' + s.eventos.join(', ') : 'Sin eventos' }}</span></span>
                <span class="tm">{{ s.utilizacion_pct }}%</span>
              </button>
            </li>
          }
        </ul>
        @if (store.agenda().length > mostrarN()) {
          <button class="btn secundario ancho" type="button" (click)="mostrarN.set(mostrarN() + 40)">Ver más</button>
        }
        @if (store.serenazgoSel(); as s) {
          <div class="detalle-ser">
            <h3>{{ s.etiqueta }} · {{ s.estado }}</h3>
            <ol class="tareas">
              @for (t of s.tareas; track $index) {
                <li [class.cancelada]="t.tipo === 'cancelada'">
                  <b>{{ store.hora(t.inicio) }}–{{ store.hora(t.fin) }}</b>
                  @if (t.tipo === 'reposicion') { Reposición } @else { Evento {{ t.evento_id }}{{ t.retraso > 0 ? ' · retraso ' + t.retraso + ' min' : '' }} }
                </li>
              } @empty { <li>Sin tareas asignadas.</li> }
            </ol>
            <div class="fila-btn">
              <button class="btn secundario" type="button" [disabled]="!s.en_servicio" (click)="store.simular({ tipo: 'baja_serenazgo', serenazgo_id: s.id })">¿Qué pasa si sale de servicio?</button>
              <button class="btn secundario" type="button" [disabled]="!s.en_servicio" (click)="store.bajaSerenazgo(s.id)">Dar de baja</button>
            </div>
          </div>
        }
      </article>
    </div>

    <!-- qué pasa si / comparación -->
    @if (store.simulacion(); as sim) {
      <article class="card sim">
        <div class="card-cab"><h2>¿Qué pasa si…? {{ sim.r.descripcion }}</h2>
          <button class="btn secundario" type="button" (click)="store.simulacion.set(null)">Cerrar</button></div>
        <table>
          <thead><tr><th scope="col">Indicador</th><th scope="col">Ahora</th><th scope="col">Si ocurre</th></tr></thead>
          <tbody>
            @for (f of filas; track f[0]) {
              <tr><td>{{ f[1] }}</td><td>{{ val(sim.r.antes, f[0]) }}</td><td><b>{{ val(sim.r.despues, f[0]) }}</b></td></tr>
            }
          </tbody>
        </table>
        <p class="sub">Se reasignarían {{ sim.r.reasignados.length }} eventos:
          @for (x of sim.r.reasignados.slice(0, 12); track x.evento_id) { <span class="chip-ev">#{{ x.evento_id }}: {{ store.etiqueta(x.de) }} → {{ store.etiqueta(x.a) }}</span> }</p>
        <button class="btn primario" type="button" (click)="store.aplicarSimulacion()">Aplicar</button>
      </article>
    }
    @if (store.comparacion(); as cmp) {
      <article class="card sim">
        <div class="card-cab"><h2>Comparación de estrategias (mismo plan, tres formas de dividir)</h2>
          <button class="btn secundario" type="button" (click)="store.comparacion.set(null)">Cerrar</button></div>
        <table>
          <thead><tr><th scope="col">Indicador</th>@for (n of nombres(cmp); track n) { <th scope="col">{{ n }}</th> }</tr></thead>
          <tbody>
            @for (f of filas; track f[0]) {
              <tr><td>{{ f[1] }}</td>@for (n of nombres(cmp); track n) { <td>{{ val(cmp[n], f[0]) }}</td> }</tr>
            }
            <tr><td></td>@for (n of nombres(cmp); track n) {
              <td><button class="btn secundario" type="button" (click)="store.cambiarEstrategia(n)">Usar {{ n }}</button></td> }</tr>
          </tbody>
        </table>
        @for (n of nombres(cmp); track n) { <p class="sub"><b>{{ n }}:</b> {{ cmp[n].descripcion }}</p> }
      </article>
    }

    <article class="card">
      <div class="card-cab"><h2>Línea de tiempo del turno</h2>
        <label class="chk"><input type="checkbox" [ngModel]="store.mostrarTodos()" (ngModelChange)="store.mostrarTodos.set($event)"> Mostrar los {{ v.serenazgos.length }}</label></div>
      <p class="sub">Barra de color = atención (rojo alta, ámbar media, verde baja); gris = traslado; azul = reposición. Línea roja = hora actual.</p>
      <div class="gantt-caja"><app-plan-timeline /></div>
    </article>

    <article class="card">
      <div class="card-cab"><h2>Eventos</h2>
        <select aria-label="Filtrar por estado" [ngModel]="store.filtro()" (ngModelChange)="store.filtro.set($event)">
          @for (e of estados; track e) { <option [value]="e">{{ e }}</option> }
        </select></div>
      <div class="gantt-caja">
        <table>
          <thead><tr><th scope="col">#</th><th scope="col">Prioridad</th><th scope="col">Tipología</th><th scope="col">Hora</th>
            <th scope="col">Estado</th><th scope="col">Serenazgo</th><th scope="col">Retraso</th><th scope="col">Acciones</th></tr></thead>
          <tbody>
            @for (e of store.eventosFiltrados().slice(0, 200); track e.id) {
              <tr [class.sel-fila]="e.id === store.selEvento()" (click)="store.seleccionarEvento(e.id)">
                <td>{{ e.id }}</td>
                <td><app-forma [p]="e.prioridad" /> {{ nombre(e.prioridad) }}</td>
                <td>{{ e.tipologia }}</td>
                <td>{{ store.hora(e.reportado_min) }}{{ e.programado ? ' (agenda)' : '' }}</td>
                <td><span class="est" [class]="'est-' + e.estado">{{ e.estado }}</span></td>
                <td>{{ store.etiqueta(e.serenazgo_id) }}</td>
                <td>{{ e.retraso ?? '—' }}</td>
                <td>
                  @if (e.estado !== 'cancelado' && e.estado !== 'atendido') {
                    <button class="btn secundario mini-b" type="button" (click)="store.cancelarEvento(e.id)">Cancelar y reasignar</button>
                    <button class="btn secundario mini-b" type="button" (click)="store.simular({ tipo: 'cancelar_evento', evento_id: e.id })">¿Y si se cancela?</button>
                  }
                </td>
              </tr>
            } @empty { <tr><td colspan="8">Sin eventos.</td></tr> }
          </tbody>
        </table>
      </div>
    </article>
  </section>
  } @else {
    <p class="card" role="status">{{ store.error() ?? 'Cargando el plan del turno…' }}</p>
  }`,
})
export class PlanPage implements OnInit, OnDestroy {
  store = inject(PlanStore);
  nSer = 100; nEv = 300; pctProg = 50; eph = 40; tiempoReal = true;
  mostrarN = signal(30);
  estados = ESTADOS;
  filas = FILAS;

  avance = computed(() => {
    const t = this.store.vista()?.turno;
    return t ? Math.round(100 * t.ahora_min / t.duracion_min) : 0;
  });
  resta = () => { const t = this.store.vista()?.turno; return t ? Math.max(1, t.duracion_min - t.ahora_min) : 1; };
  descripcion = computed(() => {
    const v = this.store.vista();
    return v?.estrategias.find((e) => e.nombre === v.estrategia)?.descripcion ?? '';
  });
  nombre = (p: 'A' | 'M' | 'B') => PRIORIDAD[p].nombre;
  nombres = (o: object) => Object.keys(o);
  val = (m: object, k: string) => (m as Record<string, number>)[k];

  recientes = computed(() => [...(this.store.vista()?.eventos ?? [])]
    .filter((e) => !e.programado).sort((a, b) => b.reportado_min - a.reportado_min).slice(0, 8));
  modo = computed(() => {
    const t = this.store.vista()?.turno;
    if (!t) return '';
    if (!t.tiempo_real) return 'SIMULADO';
    return t.velocidad === 1 ? `EN VIVO · hora de ${t.zona_horaria}` : `DEMO ×${t.velocidad}`;
  });

  async ngOnInit(): Promise<void> { await this.store.cargar(); this.store.iniciarVivo(); }
  ngOnDestroy(): void { this.store.detenerVivo(); }
}
