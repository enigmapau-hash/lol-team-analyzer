# LoL Team Analyzer

Mini PWA para ver la pestaña **Composición** del Excel del repositorio directamente en la interfaz.

## Estado actual

- Versión visible en la esquina: `version.json`
- Versión del proyecto: `package.json`
- Historial de cambios: `CHANGELOG.md`
- Auditoría de Etapa 1: `docs/etapa-1-auditoria.md`
- Arquitectura: `docs/arquitectura.md`

## Uso

1. Abre la app.
2. Elige un campeón en cada rol.
3. La tabla se actualiza sola.
4. Usa **Limpiar selección** para vaciar los 5 roles.

## Detalles

- Ya no usa IA.
- La app lee `Draft Pool.xlsx` directamente en el navegador.
- La salida reproduce las columnas de la hoja **Composición**.
- Cada rol usa su propia lista de campeones desde su hoja del Excel.
- No permite campeones repetidos.
- Muestra iconos oficiales de los campeones cuando están disponibles.
- Si el Excel no se puede leer, la app muestra un aviso claro.

## Comandos útiles

- `npm run audit:excel` → valida la estructura del Excel sin convertirlo a JSON
- `npm run audit:composition` → compara la hoja **Composición** con `tests/cases.json` directamente desde el Excel
- `npm run audit:all` → ejecuta ambas auditorías y genera un único informe consolidado
- `npm run audit:excel:report` → guarda el informe del workbook en `workbook-report.json`
- `npm run version:sync` → sincroniza versión, changelog y metadata visible

## CI / GitHub Actions

- El workflow `Stage 1 Audit` ejecuta `npm run audit:all` en cada push y pull request sobre `main`.
- El resultado se guarda como artefacto descargable: `stage1-audit.json`.

## Herramientas opcionales de desarrollo

- `npm run extract:workbook` → extrae el Excel a `draft-pool.json`
- `npm run generate:cases` → rellena los casos de prueba desde el JSON del workbook
- `npm run validate:cases` → valida el formato de `tests/cases.json`
- `npm run report:cases` → genera un informe legible de los casos

## Auditoría local

Cuando trabajes con el archivo Excel en tu equipo:

1. Descarga o copia `Draft Pool.xlsx` en la raíz del repo.
2. Instala dependencias con `npm install`.
3. Ejecuta `npm run audit:excel` para revisar hojas, columnas y fórmulas.
4. Ejecuta `npm run audit:composition` para comparar la hoja **Composición** con los casos de prueba.
5. Usa `npm run audit:all` para generar un informe único con ambas revisiones.
6. Si necesitas utilidades de pruebas, usa los comandos opcionales de desarrollo.
7. Si cambias la versión visible, usa `npm run version:sync`.

## Nota

La hoja Excel sigue siendo la fuente de verdad. La mini app solo la interpreta y la pinta en pantalla.
