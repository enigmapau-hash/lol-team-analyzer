# LoL Team Analyzer

Mini PWA para reproducir la pestaña **Composición** del Excel del repositorio directamente en la interfaz.

## Estado actual

- Versión visible en la esquina: `v1.0.0`
- Fuente de verdad: `Draft Pool.xlsx`
- La app lee el Excel directamente en el navegador.
- La salida reproduce las columnas de la hoja **Composición**.
- Cada rol usa su propia lista de campeones desde su hoja del Excel.
- No permite campeones repetidos.
- Muestra iconos oficiales de los campeones cuando están disponibles.

## Uso

1. Abre la app.
2. Elige un campeón en cada rol.
3. La tabla se actualiza sola.
4. Usa **Limpiar selección** para vaciar los 5 roles.

## Detalles

- Ya no usa IA.
- La app lee `Draft Pool.xlsx` directamente desde el repositorio.
- Si el Excel no se puede leer, la app muestra un aviso claro.
- La base queda cerrada en `v1.0.0`.

## Comandos útiles

- `npm run audit:excel` → valida la estructura del Excel sin convertirlo a JSON
- `npm run audit:composition` → compara la hoja **Composición** con `tests/cases.json` directamente desde el Excel
- `npm run audit:all` → ejecuta ambas auditorías y genera un único informe consolidado
- `npm run version:sync` → sincroniza versión, changelog y metadata visible

## CI / GitHub Actions

- El workflow `Stage 1 Audit` ejecuta `npm run audit:all` en cada push y pull request sobre `main`.

## Nota

La miniapp base ya está cerrada. Las siguientes mejoras irán como versiones menores sobre una base estable.
