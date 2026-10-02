# Validación del Excel

Este directorio se reserva para los archivos generados por la validación exacta contra `Draft Pool.xlsx`.

## Archivos generados

- `tests/composition.validation.json`: casos de prueba generados desde el workbook.
- `composition-validation-report.json`: informe de comparación contra la hoja **Composición**.

## Uso

1. Ejecuta `npm run generate:composition-cases`.
2. Ejecuta `npm run validate:composition-cases`.
3. Revisa el informe generado.

## Nota

El objetivo es conservar un punto claro para la validación del Excel sin mezclar documentación antigua ni casos obsoletos.
