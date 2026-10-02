# Arquitectura

## Fuente de verdad
- `Draft Pool.xlsx` es la fuente de verdad.
- La app lee las hojas del Excel directamente desde GitHub Raw y, si falla, prueba la ruta local.

## Flujo de datos
1. Se carga el Excel.
2. Se extraen las hojas por rol:
   - `Tabla Top`
   - `Tabla Jungla`
   - `Tabla Mid`
   - `Tabla Botline`
   - `Tabla Support`
3. El selector de campeón muestra únicamente los campeones válidos de su rol.
4. La vista de resultado reproduce la hoja `Composición`.
5. La vista rápida resume identidad, función y ritmo.
6. El badge de versión y el panel de revisión leen `version.json`.

## Componentes
- `app.js`: motor de lectura del Excel, composición y render de resultados.
- `shared-utils.js`: utilidades comunes de texto.
- `smart-search.js`: búsqueda inteligente del selector.
- `no-duplicate-options.js`: ocultación de campeones ya seleccionados.
- `selected-preview.js`: preview del campeón elegido dentro del input.
- `menu-icons.js`: iconos en el desplegable.
- `realtime-mode.js`: análisis automático al cambiar la composición.
- `result-summary.js`: vista rápida y sinergia global.
- `result-summary.css`: estilos del resumen rápido.
- `stage3-spacing.css`: espaciado y layout.
- `stage3-visual.css`: acabado visual principal.
- `stage3-animations.css`: microanimaciones.
- `version.js`: badge de versión y panel de revisión.
- `style.css`: base visual general.

## Reglas base
- No se permiten campeones repetidos.
- Cada rol usa su propia tabla.
- La interfaz debe mantenerse usable en móvil, tablet y escritorio.
- Cualquier cambio debe validarse con una auditoría visual y funcional.
