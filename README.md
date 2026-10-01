# LoL Team Analyzer

Mini PWA para analizar composiciones de League of Legends con IA.

## Uso

1. Abre la app.
2. Escribe tu OpenAI API key.
3. Completa uno o varios roles.
4. Pulsa **Analizar**.

## Detalles

- La app pide un JSON estricto para que el análisis salga estable.
- El análisis devuelve identidad, resumen, fortalezas, debilidades, roles que faltan, picks recomendados y condición de victoria.
- También funciona con drafts incompletos.
- Los campos de campeón muestran autocompletado.
- El modelo queda fijo en `gpt-4o-2024-08-06`.
- La clave se guarda en `localStorage` del navegador.

## Nota

Esta versión está pensada para uso personal o pruebas rápidas.