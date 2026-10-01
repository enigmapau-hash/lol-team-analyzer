# LoL Team Analyzer

Mini PWA para ver la pestaña **Composición** del Excel del repositorio directamente en la interfaz.

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

## Nota

La hoja Excel sigue siendo la fuente de verdad. La mini app solo la interpreta y la pinta en pantalla.
