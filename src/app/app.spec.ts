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
