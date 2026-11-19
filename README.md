# Frontend — Asignación de serenazgo (Ventanilla)

Interfaz web en **Angular 22** (TypeScript, standalone components y signals).
Consume la API del backend Python (proyecto aparte).

## Ejecutar
Requiere Node.js 22.22 o superior y npm. **El backend debe estar corriendo** (por defecto en http://127.0.0.1:8000).
```bash
npm install
npm start          # ng serve → http://localhost:4200
```
- URL del backend: `src/environments/environment.ts` (`apiUrl`).
- Producción: `npm run build` (salida en `dist/`).
- Prueba de integración (necesita el backend en el puerto 8000): `npm test`.

## Estructura (`src/app/`)
| Archivo | Contenido |
|---|---|
| core/api.service.ts | Cliente HTTP: una función por endpoint |
| core/despacho.store.ts | Estado de la pantalla (signals) y acciones |
| core/models.ts | Interfaces TypeScript de la API |
| components/mapa.component.ts | Mapa SVG de la red G1 (y minimapa sin cobertura) |
| components/forma.component.ts | Forma por prioridad (triángulo, círculo, cuadrado) |
| components/incidente-dialog.component.ts | Registro de incidente (RF01) |
| pages/*.page.ts | Despacho (Figura 4), Incidentes, Unidades, Rutas, Reportes |
| app.ts | Marco: navegación, cabecera, toast |
