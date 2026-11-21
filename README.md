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
- **Plan de turno (en vivo):** el reloj sigue la **hora real de Lima** (con segundos), la página se actualiza sola cada pocos segundos, los accidentes y demás eventos nuevos se integran al instante con un aviso, y el panel *Actividad en vivo* los lista. Hay modo *Demo ×10/×60/×300* y modo simulado manual. El día de 8 horas de 100+ serenazgos: reloj, mapa, agenda por serenazgo (eventos 1 y 2 → serenazgo 1…),
  línea de tiempo, cancelar y reasignar, redistribuir libres, "¿qué pasa si…?" y comparación de estrategias.
- Incidentes, Unidades, Rutas y Reportes.

## Mapa (Ventanilla, Callao)
Los mapas usan **Leaflet + OpenStreetMap**, como Google Maps: se arrastra para mover, rueda/doble clic/botones para el zoom,
escala en metros y botón **Centrar**. Se puede explorar **toda Lima y el Callao** (alejando el zoom), pero el mapa arranca encuadrado en Ventanilla, la zona de operación se resalta (recuadro punteado, lo demás atenuado) y el botón **Centrar en Ventanilla** vuelve a ella. Los clics para ubicar eventos solo valen dentro de la zona.
- **Todo queda en tierra firme.** El área de operación (recuadro punteado, 8 × 5 km) está tierra adentro de Ventanilla:
  lat -11.8375 a -11.8825 y lng -77.1368 a -77.0633, a ≈2 km del mar. `geo.ts` incluye la línea de costa real (puntos de playa
  de OEFA y MINSA/DIGESA) y bloquea los clics en el mar o fuera del área. La prueba de integración verifica que la red vial,
  las bases, los incidentes, los eventos y los serenazgos queden a ≥ 1 km de la costa.
- `src/app/core/geo.ts` convierte las coordenadas del backend a latitud/longitud. Con la red **simulada** (km) el plano se ancla al
  centro del área de operación (-11.860, -77.100); con la red **real** (`RED=osmnx` en el backend) usa las coordenadas reales sin cambios.
- **Clic en una base** → popup con los serenazgos que tiene a cargo (por tipo, libres/ocupadas y sus eventos).
- La red vial simulada se puede ver u ocultar en el control de capas del mapa (arriba a la derecha). Mientras la red sea simulada,
  las rutas dibujadas **no siguen las calles reales**; con OSMnx sí.
- Los mosaicos vienen del servidor público de OpenStreetMap (uso moderado, con atribución). Para mucho tráfico usa un proveedor
  propio (MapTiler, Stadia, etc.) cambiando la URL en `components/mapa-base.ts`.

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
| components/mapa-geo · plan-mapa-geo · mapa-base | Mapas Leaflet/OpenStreetMap (despacho y plan) |
| components/mapa · plan-timeline | Minimapa SVG y línea de tiempo (Gantt) |
| pages/*.page.ts | Despacho, Plan de turno, Incidentes, Unidades, Rutas, Reportes |
| app.ts | Marco: navegación, cabecera, toast |
