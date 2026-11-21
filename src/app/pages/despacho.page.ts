import { Component, computed, inject } from '@angular/core';
import { DespachoStore } from '../core/despacho.store';
import { MinutosPipe } from '../core/minutos.pipe';
import { PRIORIDAD } from '../core/models';
import { FormaComponent } from '../components/forma.component';
import { MapaComponent } from '../components/mapa.component';
import { MapaGeoComponent } from '../components/mapa-geo.component';

/** Pantalla principal del operador (Figura 4 del informe). */
@Component({
  selector: 'app-despacho-page',
  imports: [MapaComponent, MapaGeoComponent, FormaComponent, MinutosPipe],
  template: `
  @if (store.errorCarga(); as e) {
    <p class="card" role="alert">{{ e }}</p>
  }
  @if (store.asig(); as asig) {
  <section class="vista despacho" aria-label="Despacho">
    <div class="izq">
      <article class="card resumen" aria-labelledby="h-resumen">
        <div class="card-cab">
          <h2 id="h-resumen">Resumen del ciclo</h2>
          <button class="btn chip-btn" type="button" (click)="store.nuevoCiclo()">Nuevo ciclo</button>
        </div>
        <div class="mapa-caja" [class.modo-ubicar]="store.ubicando()">
          <div class="mapa-chips flotante">
            <span class="chip">Red vial G1 · {{ store.red()?.n_nodos }} nodos</span>
            <span class="chip">Tmax {{ asig.metricas.tmax }} min</span>
          </div>
          <div class="mapa-ctrl flotante">
            <button class="btn mini" type="button" (click)="store.bloquearTramoDeRuta()"
                    title="Bloquea un tramo de la ruta seleccionada y recalcula">Simular bloqueo</button>
            @if (store.red()?.bloqueados?.length) {
              <button class="btn mini" type="button" (click)="store.restablecerRed()">Restablecer red</button>
            }
          </div>
          <div id="mapa"><app-mapa-geo /></div>
          <p class="sr">{{ descripcion() }}</p>
          <ul class="leyenda" aria-label="Leyenda del mapa">
            <li><app-forma p="A" [size]="14" /> Alta</li>
            <li><app-forma p="M" [size]="14" /> Media</li>
            <li><app-forma p="B" [size]="14" /> Baja</li>
            <li><span class="sw-base" aria-hidden="true">B</span> Base</li>
            <li><span class="sw-ruta" aria-hidden="true"></span> Ruta</li>
          </ul>
        </div>
        <dl class="stats">
          <div><dt>Tiempo medio</dt><dd>{{ store.tiempoMedio() | minutos }}<small>Umbral Tmax {{ asig.metricas.tmax }} min</small></dd></div>
          <div class="dest"><dt>Atendibles dentro de Tmax</dt><dd>{{ store.asignaciones().length }} / {{ asig.metricas.incidentes_activos }}<small>{{ asig.sin_cobertura.length }} sin cobertura</small></dd></div>
          <div><dt>Unidades disponibles</dt><dd>{{ asig.metricas.unidades_disponibles }} / {{ asig.metricas.unidades_total }}<small>en {{ store.red()?.bases?.length }} bases · {{ ms() }} ms</small></dd></div>
        </dl>
      </article>

      <div class="selcol">
        <article class="card sel-inc" aria-live="polite">
          @if (store.seleccionado(); as inc) {
            <div class="linea"><app-forma [p]="inc.prioridad" [size]="18" /><span>Incidente seleccionado · {{ nombre(inc.prioridad) }}</span></div>
            <p class="id">#{{ inc.id_caso }}</p>
            <p class="tip">{{ inc.tipologia }}</p>
            <p class="dir">{{ inc.direccion }}</p>
          } @else {
            <h2>Incidente seleccionado</h2><p class="dir">No hay incidentes activos.</p>
          }
        </article>

        @if (store.seleccionado(); as inc) {
          @if (store.asigSel(); as a) {
            <article class="card sel-uni" [class]="'p-' + inc.prioridad" aria-live="polite">
              <span class="etq">Unidad sugerida{{ a.modificada ? ' (modificada)' : '' }}</span>
              <span class="nombre">{{ a.unidad }}</span>
              <label class="sr" for="cambiar">Cambiar unidad sugerida</label>
              <select id="cambiar" (change)="cambiar($event)">
                @for (o of opciones(); track o.unidad_id) {
                  <option [value]="o.unidad_id" [selected]="o.unidad_id === a.unidad_id">{{ o.unidad }} · {{ o.base }} · {{ o.tiempo | minutos }}</option>
                }
              </select>
              <span class="tiempo">{{ a.tiempo | minutos }}</span>
              <span class="detalle">desde {{ a.base }}@if (alternativa(); as alt) { · alternativa {{ alt.unidad }}, {{ alt.tiempo | minutos }} }</span>
              <button class="btn-ok" type="button" (click)="store.confirmar([a.incidente_id])"
                      [attr.aria-label]="'Confirmar asignación de ' + a.unidad + ' al incidente ' + a.incidente_id">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
              </button>
            </article>
          } @else {
            <article class="card sel-uni vacio" aria-live="polite">
              <h2>Sin cobertura</h2>
              <p>{{ motivo() }}</p>
              <p class="detalle">Puedes escalarlo al supervisor.</p>
            </article>
          }
        } @else {
          <article class="card sel-uni vacio"><h2>Unidad sugerida</h2><p>Inicia un nuevo ciclo o registra un incidente.</p></article>
        }
      </div>

      <div class="bases">
        @for (b of asig.por_base; track b.id) {
          <article class="card base-card" [attr.aria-label]="b.nombre">
            <div class="cab"><span class="ic" aria-hidden="true">B</span>
              <div><h2>{{ b.nombre }}</h2><p class="sub">{{ b.total }} unidades asignadas a la base</p></div></div>
            <div class="fila"><span>Disponibilidad</span><span>{{ pct(b.libres, b.total) }}%</span></div>
            <div class="barra" role="progressbar" [attr.aria-label]="'Disponibilidad de ' + b.nombre"
                 aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="pct(b.libres, b.total)">
              <i [style.width.%]="pct(b.libres, b.total)"></i></div>
            <div class="pie"><span>{{ b.libres }} / {{ b.total }} libres</span><span class="pill-rojo">{{ b.asignaciones }} asignaciones</span></div>
          </article>
        }
      </div>
    </div>

    <aside class="der" aria-label="Incidentes">
      <article class="card lista-card">
        <div class="card-cab"><h2>Incidentes activos</h2><span class="cuenta">{{ store.lista().length }} de {{ store.incidentes().length }}</span></div>
        <div class="tabs" role="group" aria-label="Orden de la lista">
          <button class="tab" type="button" [class.activo]="store.orden() === 'prioridad'" [attr.aria-pressed]="store.orden() === 'prioridad'" (click)="store.orden.set('prioridad')">Prioridad</button>
          <button class="tab" type="button" [class.activo]="store.orden() === 'recientes'" [attr.aria-pressed]="store.orden() === 'recientes'" (click)="store.orden.set('recientes')">Recientes</button>
        </div>
        <ul class="lista">
          @for (i of store.lista(); track i.id_caso) {
            <li>
              <button class="item" type="button" [attr.aria-current]="i.id_caso === store.sel() ? 'true' : null" (click)="store.seleccionar(i.id_caso)">
                <app-forma [p]="i.prioridad" [size]="18" />
                <span><span class="t1">#{{ i.id_caso }} · {{ nombre(i.prioridad) }}</span><br>
                  <span class="t2">{{ i.tipologia }}@if (store.asigPorId().get(i.id_caso); as e) { · {{ e.unidad }} · {{ e.base }} }</span></span>
                @if (store.asigPorId().get(i.id_caso); as e) { <span class="tm">{{ e.tiempo | minutos }}</span> }
                @else { <span class="tm sin">Sin cobertura</span> }
              </button>
            </li>
          } @empty { <li class="t2">Sin resultados.</li> }
        </ul>
      </article>

      <article class="card cobertura-card">
        <div class="card-cab"><h2>Sin cobertura</h2><span class="pill-rojo">{{ asig.sin_cobertura.length }}</span></div>
        <div id="minimapa"><app-mapa [mini]="true" /></div>
        <button class="btn secundario ancho" type="button" [disabled]="!asig.sin_cobertura.length" (click)="store.escalar()">Escalar al supervisor</button>
        <button class="btn primario ancho" type="button" [disabled]="!store.asignaciones().length" (click)="store.confirmar()">
          {{ store.asignaciones().length ? 'Confirmar ' + store.asignaciones().length + ' asignaciones' : 'Sin asignaciones' }}
        </button>
      </article>
    </aside>
  </section>
  }`,
})
export class DespachoPage {
  store = inject(DespachoStore);

  nombre = (p: 'A' | 'M' | 'B') => PRIORIDAD[p].nombre;
  pct = (a: number, b: number) => (b ? Math.round(a / b * 100) : 0);
  ms = computed(() => String(this.store.asig()?.metricas.calculo_ms ?? 0).replace('.', ','));
  opciones = computed(() => { const b = this.store.baseSel(); return b ? [b, ...b.alternativas] : []; });
  alternativa = computed(() => {
    const b = this.store.baseSel(), a = this.store.asigSel();
    return b && a && !a.modificada ? b.alternativas[0] ?? null : null;
  });
  motivo = computed(() => this.store.sinCobPorId().get(this.store.sel() ?? '')?.motivo === 'fuera_de_alcance'
    ? `Ninguna unidad libre llega en ${this.store.asig()?.metricas.tmax} min o menos.`
    : 'Las unidades que llegan a tiempo ya están asignadas a incidentes de igual o mayor prioridad.');
  descripcion = computed(() => {
    const m = this.store.asig()?.metricas, a = this.store.asigSel();
    if (!m) return '';
    return `Mapa de la red vial: ${m.incidentes_activos} incidentes activos, ${this.store.asignaciones().length} con unidad recomendada dentro de ${m.tmax} minutos y ${this.store.asig()?.sin_cobertura.length} sin cobertura.` +
      (a ? ` Incidente seleccionado ${a.incidente_id}: unidad ${a.unidad}.` : '');
  });

  cambiar(e: Event): void {
    this.store.cambiarUnidad(+(e.target as HTMLSelectElement).value);
  }
}
