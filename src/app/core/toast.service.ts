import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly msg = signal('');
  readonly visible = signal(false);
  readonly error = signal(false);
  private t?: ReturnType<typeof setTimeout>;

  mostrar(msg: string, error = false): void {
    this.msg.set(msg);
    this.error.set(error);
    this.visible.set(true);
    clearTimeout(this.t);
    this.t = setTimeout(() => this.visible.set(false), 3800);
  }
}
