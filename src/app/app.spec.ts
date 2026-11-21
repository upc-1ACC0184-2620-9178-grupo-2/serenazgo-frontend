import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

/** Prueba de integración: requiere el backend corriendo en http://127.0.0.1:8000 */
describe('Aplicativo de despacho (integración con el backend)', () => {
  const esperar = async (fx: { detectChanges(): void; nativeElement: HTMLElement }, css: string) => {
    for (let i = 0; i < 80; i++) {
      await new Promise((r) => setTimeout(r, 100));
      fx.detectChanges();
      if (fx.nativeElement.querySelector(css)) return;
    }
    throw new Error('No apareció ' + css + ' | alerta: ' + fx.nativeElement.querySelector('[role=alert]')?.textContent + ' | html: ' + fx.nativeElement.innerHTML.slice(0, 400));
  };

  it('muestra el despacho, selecciona, confirma y navega', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withFetch()), provideRouter(routes)] });
    const fx = TestBed.createComponent(App);
    const el: HTMLElement = fx.nativeElement;
    fx.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/despacho');
    await esperar(fx, '.stats dd');

    expect(el.querySelectorAll('.item').length).toBe(50);
    expect(el.querySelectorAll('.base-card').length).toBe(3);
    expect(el.querySelectorAll('#mapa .mk').length).toBe(50);
    expect(el.querySelector('.chip')?.textContent).toContain('1503');
    console.log('STATS:', el.querySelector('.stats')?.textContent?.replace(/\s+/g, ' '));

    const antes = el.querySelector('.sel-inc .id')?.textContent;
    (el.querySelectorAll('.item')[3] as HTMLElement).click();
    fx.detectChanges();
    expect(el.querySelector('.sel-inc .id')?.textContent).not.toBe(antes);

    (el.querySelector('.btn.primario.ancho') as HTMLElement).click();
    await new Promise((r) => setTimeout(r, 1500));
    fx.detectChanges();
    console.log('TOAST:', el.querySelector('.toast')?.textContent);
    expect(el.querySelector('.toast')?.textContent).toContain('confirmada');

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/unidades');
    fx.detectChanges();
    expect(el.querySelectorAll('tbody tr').length).toBe(94);
    await router.navigateByUrl('/reportes');
    await new Promise((r) => setTimeout(r, 800));
    fx.detectChanges();
    expect(el.querySelectorAll('.kpi').length).toBe(4);
    expect(el.querySelector('h1')?.textContent).toBe('Reportes');
  }, 40000);
});

describe('Plan de turno (integración con el backend)', () => {
  const esperar = async (fx: { detectChanges(): void; nativeElement: HTMLElement }, css: string, ms = 12000) => {
    for (let i = 0; i < ms / 100; i++) {
      await new Promise((r) => setTimeout(r, 100));
      fx.detectChanges();
      if (fx.nativeElement.querySelector(css)) return;
    }
    throw new Error('No apareció ' + css + ' | ' + fx.nativeElement.querySelector('main')?.textContent?.slice(0, 200));
  };
  const pausa = async (fx: { detectChanges(): void }, ms = 1500) => { await new Promise((r) => setTimeout(r, ms)); fx.detectChanges(); };

  it('avanza el reloj, selecciona, cancela, redistribuye y compara estrategias', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withFetch()), provideRouter(routes)] });
    const fx = TestBed.createComponent(App);
    const el: HTMLElement = fx.nativeElement;
    fx.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/plan');
    await esperar(fx, '.plan-kpis');

    expect(el.querySelector('h1')?.textContent).toBe('Plan de turno');
    expect(el.querySelector('.reloj .eyebrow')?.textContent).toContain('8 horas');
    expect(el.querySelectorAll('.agenda .item').length).toBeGreaterThan(10);
    expect(el.querySelectorAll('app-plan-mapa .mk').length).toBeGreaterThan(100);       // eventos + 100 serenazgos
    expect(el.querySelectorAll('app-plan-timeline .fila').length).toBeGreaterThan(5);
    const hora0 = el.querySelector('.reloj .hora')?.textContent;

    const btn = (txt: string) => [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(txt)) as HTMLElement;
    btn('+60 min').click();
    await pausa(fx);
    expect(el.querySelector('.reloj .hora')?.textContent).not.toBe(hora0);
    console.log('HORA:', hora0, '->', el.querySelector('.reloj .hora')?.textContent, '| KPIS:', el.querySelector('.plan-kpis')?.textContent?.replace(/\s+/g, ' '));

    (el.querySelector('.agenda .item') as HTMLElement).click();
    await pausa(fx, 800);
    expect(el.querySelector('.detalle-ser h3')).toBeTruthy();

    const cancelar = [...el.querySelectorAll('tbody button')].find((b) => b.textContent?.includes('Cancelar y reasignar')) as HTMLElement;
    cancelar.click();
    await pausa(fx);
    console.log('TOAST:', el.querySelector('.toast')?.textContent);
    expect(el.querySelector('.toast')?.textContent).toContain('cancelado');

    btn('Redistribuir').click();
    await pausa(fx);
    expect(el.querySelector('.nota')?.textContent).toContain('Redistribución');

    btn('Comparar estrategias').click();
    await pausa(fx);
    expect(el.querySelector('.sim')?.textContent).toContain('concentrada');
  }, 60000);
});
