import { Component, OnInit, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { IncidenteDialogComponent } from './components/incidente-dialog.component';
import { DespachoStore } from './core/despacho.store';
import { ToastService } from './core/toast.service';

/** Marco de la aplicación: navegación lateral, cabecera y rutas. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, IncidenteDialogComponent],
  template: `
  <a class="saltar" href="#principal">Saltar al contenido</a>
  <div class="app">
    <nav class="nav" aria-label="Navegación principal">
      <div class="logo" role="img" aria-label="Serenazgo Ventanilla">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.4-2.9 8-7 10-4.1-2-7-5.6-7-10V6l7-3z"/><path d="M9 16c0-2 3-2 3-4s-3-1.5-3-3.5"/><circle cx="15" cy="8.5" r="1"/></svg>
      </div>
      @for (n of nav; track n.ruta) {
        <a class="nav-btn" [routerLink]="'/' + n.ruta" routerLinkActive="activo" ariaCurrentWhenActive="page" [attr.aria-label]="n.titulo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="n.d"/></svg>
        </a>
      }
    </nav>

    <div class="contenido">
      <header class="top">
        <div><p class="eyebrow">Principal</p><h1>{{ titulo() }}</h1></div>
        <span class="aviso">Datos ilustrativos · red simulada</span>
        <label class="buscar">
          <span class="sr">Buscar incidente o unidad</span>
          <input type="search" name="q" placeholder="Buscar incidente o unidad" autocomplete="off"
                 [ngModel]="store.q()" (ngModelChange)="store.q.set($event)">
        </label>
        <button class="btn secundario" type="button" (click)="store.dialogoInc.set(true)">Registrar incidente</button>
        <div class="usuario" role="img" aria-label="Operador GJ">GJ</div>
      </header>
      <main id="principal" tabindex="-1"><router-outlet /></main>
    </div>
  </div>

  <app-incidente-dialog />
  <div class="toast" [class.ver]="toast.visible()" [class.err]="toast.error()" role="status" aria-live="polite">{{ toast.msg() }}</div>`,
})
export class App implements OnInit {
  store = inject(DespachoStore);
  toast = inject(ToastService);
  private router = inject(Router);

  nav = [
    { ruta: 'despacho', titulo: 'Despacho', d: 'M12 4a8 8 0 100 16 8 8 0 000-16z M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z M12 2v3M12 19v3M2 12h3M19 12h3' },
    { ruta: 'plan', titulo: 'Plan de turno', d: 'M5 4h14v16H5z M5 9h14 M9 2v4 M15 2v4 M8 13h3 M8 16.5h6' },
    { ruta: 'incidentes', titulo: 'Incidentes', d: 'M12 3l10 18H2L12 3z M12 10v5M12 18v.5' },
    { ruta: 'unidades', titulo: 'Unidades', d: 'M12 3l7 3v5c0 4.4-2.9 8-7 10-4.1-2-7-5.6-7-10V6l7-3z M9 12l2 2 4-4' },
    { ruta: 'rutas', titulo: 'Rutas', d: 'M6 15.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z M18 3.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z M8.5 18H15a3 3 0 000-6H9a3 3 0 010-6h6.5' },
    { ruta: 'reportes', titulo: 'Reportes', d: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
  ];
  private url = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url)),
    { initialValue: this.router.url });
  titulo = computed(() => this.nav.find((n) => this.url().startsWith('/' + n.ruta))?.titulo ?? 'Despacho');

  ngOnInit(): void { this.store.iniciar(); }
}
