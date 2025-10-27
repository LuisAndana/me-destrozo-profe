// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withDebugTracing } from '@angular/router';
import { routes } from './app/app.routes';

import { App } from './app/app';
import { appConfig } from './app/app.config';

// ===== Bloqueo global de window.alert (evita los pop-ups del navegador) =====
declare global {
  interface Window {
    __originalAlert?: (message?: any) => void;
  }
}

if (typeof window !== 'undefined') {
  // Guarda el alert original por si quieres restaurarlo desde la consola (window.__originalAlert?.('msg'))
  const original = window.alert?.bind(window);
  window.__originalAlert = original;

  // Reemplaza por un no-op que además loguea en consola
  window.alert = (msg?: any) => {
    const text = (msg === undefined || msg === null) ? '' : String(msg);
    // No mostramos ningún modal del navegador
    console.warn('[alert bloqueado]', text);

    // Opcional: emitir evento para que algún componente escuche y muestre el mensaje en pantalla si lo desea
    try {
      document.dispatchEvent(new CustomEvent('app-alert', { detail: text }));
    } catch {}
  };
}
// ==========================================================================

bootstrapApplication(App, {
  ...appConfig,
  providers: [
    ...(appConfig.providers ?? []),
    provideRouter(routes, withDebugTracing()), // quítalo en prod si no quieres tanto log
    provideHttpClient(),
  ],
}).catch(err => console.error(err));
