# LoL Team Analyzer

Mini PWA para analizar composiciones de League of Legends con una base local.

## Uso

1. Abre la app.
2. Escribe uno o varios roles.
3. Pulsa **Analizar**.

## Detalles

- Ya no usa IA.
- La app está preparada para leer `draft-pool.json` como base local.
- El objetivo es reproducir la lógica de la hoja **Composiciones** del Excel.
- Los campos de campeón muestran autocompletado.
- Si la base local está vacía, la app avisa y muestra una salida de apoyo.

## Nota

La hoja Excel sigue siendo la fuente de verdad; primero hay que exportar su lógica a `draft-pool.json` para que el cálculo sea equivalente.