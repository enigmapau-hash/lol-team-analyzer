# Tests y auditoría

Este directorio recoge casos de referencia para comparar la hoja **Composición** del Excel con la mini app.

## Objetivo

Verificar que, para una selección concreta de campeones, la app devuelve el mismo resultado que el Excel.

## Formato recomendado de caso

Cada caso debería incluir:

- `name`: nombre corto del caso.
- `composition`: campeones seleccionados por rol.
- `expected`: resultado esperado según el Excel.
- `notes`: observaciones de revisión.

## Ejemplo

```json
{
  "name": "composition-front-to-back",
  "composition": {
    "top": "Ornn",
    "jungle": "Vi",
    "mid": "Ahri",
    "adc": "Jinx",
    "support": "Lulu"
  },
  "expected": {
    "status": "pending"
  },
  "notes": "Completar con el resultado exacto del Excel."
}
```

## Uso

1. Tomar una composición del Excel.
2. Volcar el resultado exacto a un JSON.
3. Comprobar que la mini app reproduce el mismo valor.
4. Marcar el caso como validado.

## Criterio de cierre de la etapa

La etapa se considera cerrada cuando exista un conjunto mínimo de casos reales validados y la app reproduzca los resultados del Excel sin diferencias.