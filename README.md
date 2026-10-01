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
- La app lee `Draft Pool.xlsx` en el navegador.
- La salida reproduce las columnas de la hoja **Composición**.
- Cada rol usa su propia lista de campeones desde su hoja del Excel.
- No permite campeones repetidos.
- Muestra iconos oficiales de los campeones cuando están disponibles.
- Si el Excel no se puede leer, la app muestra un aviso claro.

## Comandos útiles

- `npm run extract:workbook` → extrae el Excel a `draft-pool.json`
- `npm run generate:cases` → rellena los casos de prueba desde el JSON del workbook
- `npm run validate:cases` → valida el formato de `tests/cases.json`
- `npm run audit:stage1:full` → ejecuta extracción, generación y validación
- `npm run version:sync` → sincroniza versión, changelog y metadata visible

## Auditoría local

Cuando trabajes con el archivo Excel en tu equipo:

1. Descarga o copia `Draft Pool.xlsx` en la raíz del repo.
2. Instala dependencias con `npm install`.
3. Ejecuta `npm run extract:workbook` para generar `draft-pool.json`.
4. Ejecuta `npm run generate:cases` para rellenar `tests/cases.json` con datos del workbook.
5. Ejecuta `npm run validate:cases` para comprobar el formato.
6. Ejecuta `npm run audit:stage1:full` para repetir todo el flujo de auditoría.
7. Si cambias la versión visible, usa `npm run version:sync`.

## Nota

La hoja Excel sigue siendo la fuente de verdad. La mini app solo la interpreta y la pinta en pantalla.
