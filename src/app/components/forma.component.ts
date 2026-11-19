import { Component, input } from '@angular/core';
import { Prioridad } from '../core/models';

/** Forma propia por prioridad (triángulo = alta, círculo = media, cuadrado = baja). */
@Component({
  selector: 'app-forma',
  template: `<svg class="forma" [attr.width]="size()" [attr.height]="size()" viewBox="0 0 16 16" aria-hidden="true">
    @switch (p()) {
      @case ('A') { <polygon points="8,2 15,14 1,14" class="fA"/> }
      @case ('M') { <circle cx="8" cy="8" r="6.5" class="fM"/> }
      @default { <rect x="2" y="2" width="12" height="12" rx="1.5" class="fB"/> }
    }</svg>`,
})
export class FormaComponent {
  p = input.required<Prioridad>();
  size = input(16);
}
