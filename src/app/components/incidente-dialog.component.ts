import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DespachoStore } from '../core/despacho.store';
import { Prioridad } from '../core/models';

/** Diálogo para registrar un incidente (RF01, CU01). */
@Component({
  selector: 'app-incidente-dialog',
  imports: [FormsModule],
  template: `
  <dialog #dlg aria-labelledby="dlg-titulo" (close)="store.dialogoInc.set(false)">
    <form (ngSubmit)="enviar()">
      <h2 id="dlg-titulo">Registrar incidente</h2>
      <label>Tipología
        <select name="tip" [(ngModel)]="tip" required>
          @for (t of store.estado()?.tipologias ?? []; track t) { <option [value]="t">{{ t }}</option> }
        </select>
      </label>
      <label>Dirección
        <input name="dir" [(ngModel)]="dir" required minlength="3" maxlength="120" placeholder="Calle 12, cdra. 3">
      </label>
      <label>Prioridad
        <select name="pri" [(ngModel)]="pri" required>
          <option value="A">Alta</option><option value="M">Media</option><option value="B">Baja</option>
        </select>
      </label>
      <div class="fila-xy">
        <label>X (km)<input name="x" type="number" step="0.01" [(ngModel)]="x" required></label>
        <label>Y (km)<input name="y" type="number" step="0.01" [(ngModel)]="y" required></label>
      </div>
      <button class="btn secundario" type="button" (click)="ubicar()">Ubicar con un clic en el mapa</button>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      <div class="acciones">
        <button class="btn secundario" type="button" (click)="cancelar()">Cancelar</button>
        <button class="btn primario" type="submit">Registrar</button>
      </div>
    </form>
  </dialog>`,
})
export class IncidenteDialogComponent {
  store = inject(DespachoStore);
  private router = inject(Router);
  private dlg = viewChild<ElementRef<HTMLDialogElement>>('dlg');

  tip = signal('');
  dir = signal('');
  pri = signal<Prioridad>('M');
  x = signal(0);
  y = signal(0);
  error = signal('');

  constructor() {
    effect(() => {
      const abierto = this.store.dialogoInc();
      const el = this.dlg()?.nativeElement;
      if (!el) return;
      if (abierto && !el.open) {
        const L = this.store.red()?.limites;
        const p = this.store.punto() ?? (L ? { x: +((L.xmin + L.xmax) / 2).toFixed(2), y: +((L.ymin + L.ymax) / 2).toFixed(2) } : { x: 0, y: 0 });
        this.x.set(p.x);
        this.y.set(p.y);
        if (!this.tip()) this.tip.set(this.store.estado()?.tipologias[0] ?? '');
        this.error.set('');
        el.showModal();
      } else if (!abierto && el.open) {
        el.close();
      }
    });
  }

  ubicar(): void {
    this.store.dialogoInc.set(false);
    this.store.ubicando.set(true);
    this.router.navigateByUrl('/despacho');
    this.store.toast.mostrar('Haz clic en el mapa para ubicar el incidente.');
  }
  cancelar(): void {
    this.store.dialogoInc.set(false);
    this.store.punto.set(null);
  }
  async enviar(): Promise<void> {
    try {
      await this.store.registrarIncidente({
        tipologia: this.tip(), direccion: this.dir().trim(), prioridad: this.pri(), x: this.x(), y: this.y(),
      });
      this.dir.set('');
      this.store.dialogoInc.set(false);
    } catch (e) {
      this.error.set(this.store.errorDe(e));
    }
  }
}
