// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withDebugTracing } from '@angular/router';
import { routes } from './app/app.routes';

import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, {
  ...appConfig,
  providers: [
    ...(appConfig.providers ?? []),     // si aquí ya hay provideRouter(routes), quítalo en app.config
    provideRouter(routes, withDebugTracing()), // ← activa logs detallados de navegación/guards
    provideHttpClient(),                        // ← HttpClient para toda la app
  ],
}).catch(err => console.error(err));
