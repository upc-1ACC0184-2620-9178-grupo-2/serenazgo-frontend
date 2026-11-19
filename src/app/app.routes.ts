import { Routes } from '@angular/router';
import { DespachoPage } from './pages/despacho.page';
import { IncidentesPage } from './pages/incidentes.page';
import { UnidadesPage } from './pages/unidades.page';
import { RutasPage } from './pages/rutas.page';
import { ReportesPage } from './pages/reportes.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'despacho' },
  { path: 'despacho', component: DespachoPage },
  { path: 'incidentes', component: IncidentesPage },
  { path: 'unidades', component: UnidadesPage },
  { path: 'rutas', component: RutasPage },
  { path: 'reportes', component: ReportesPage },
  { path: '**', redirectTo: 'despacho' },
];
