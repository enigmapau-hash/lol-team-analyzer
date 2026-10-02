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

## Validación contra el Excel

La validación exacta ya está montada para comprobar 30 casos generados desde el propio workbook:

- `npm run generate:composition-cases` → genera `tests/composition.validation.json`
- `npm run validate:composition-cases` → compara esos casos contra el Excel y escribe `composition-validation-report.json`
- `npm run audit:composition` → genera y valida en un solo paso
- `npm run audit:all` → ejecuta la validación exacta, escribe `workbook-report.json` y revisa los assets públicos

## Comandos útiles

- `npm run audit:excel` → valida la estructura del Excel y escribe `workbook-report.json`
- `npm run audit:composition` → genera 30 casos exactos desde el Excel y escribe `composition-validation-report.json`
- `npm run audit:all` → ejecuta la validación exacta, escribe ambos reportes y revisa los assets públicos
- `npm run version:sync` → sincroniza versión, changelog y metadata visible

## CI / GitHub Actions

- El workflow `Stage 1 Audit` ejecuta `npm run audit:all` en cada push y pull request sobre `main`.
- Los artefactos del workflow incluyen `workbook-report.json`, `composition-validation-report.json` y `tests/composition.validation.json`.

## Nota

La miniapp base ya está cerrada. Las siguientes mejoras irán como versiones menores sobre una base estable.
