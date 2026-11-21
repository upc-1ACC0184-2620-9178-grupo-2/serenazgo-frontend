# Frontend — Asignación de serenazgo (Ventanilla)

Interfaz web en **Angular 22** (TypeScript, standalone components y signals).
Consume la API del backend Python (proyecto aparte).

## Ejecutar en local
Requiere Node.js 22.22 o superior. **El backend debe estar corriendo** en http://127.0.0.1:8000.
```bash
npm install
npm start          # ng serve → http://localhost:4200
```
Pruebas de integración (necesitan el backend en el puerto 8000): `npm test`.

## Pantallas
- **Despacho:** asignación 1 unidad ↔ 1 incidente (Figura 4 del informe).
- **Plan de turno:** el día de 8 horas de 100+ serenazgos: reloj, mapa, agenda por serenazgo (eventos 1 y 2 → serenazgo 1…),
  línea de tiempo, cancelar y reasignar, redistribuir libres, "¿qué pasa si…?" y comparación de estrategias.
- Incidentes, Unidades, Rutas y Reportes.

## URL del backend (por qué "no conecta" al desplegar)
- `src/environments/environment.ts` → desarrollo (`http://127.0.0.1:8000`).
- `src/environments/environment.production.ts` → producción: **URL HTTPS pública del backend, sin puerto**
  (`https://serenazgo-backend-production.up.railway.app`). `ng build` la usa automáticamente (`fileReplacements` en `angular.json`).
- El backend debe permitir el dominio del frontend en CORS (variable `ORIGENES_PERMITIDOS`, ver su README).

## Despliegue en Vercel
`vercel.json` ya define: `buildCommand: npm run build`, `outputDirectory: dist/frontend/browser` y la reescritura a
`index.html` (necesaria para que `/plan`, `/despacho`… no den 404 al recargar). Tras cambiar `environment.production.ts`,
haz *Redeploy*.

## Estructura (`src/app/`)
| Archivo | Contenido |
|---|---|
| core/api.service.ts | Cliente HTTP: una función por endpoint |
| core/despacho.store.ts · core/plan.store.ts | Estado de cada pantalla (signals) y acciones |
| core/models.ts | Interfaces TypeScript de la API |
| components/mapa · plan-mapa · plan-timeline | Mapas SVG y línea de tiempo (Gantt) |
| pages/*.page.ts | Despacho, Plan de turno, Incidentes, Unidades, Rutas, Reportes |
| app.ts | Marco: navegación, cabecera, toast |
