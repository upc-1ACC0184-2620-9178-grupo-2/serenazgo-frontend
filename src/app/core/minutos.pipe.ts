import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'minutos' })
export class MinutosPipe implements PipeTransform {
  transform(n: number | null | undefined): string {
    return (n ?? 0).toFixed(1).replace('.', ',') + ' min';
  }
}
