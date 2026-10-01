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
5. El badge de versión y el panel de revisión leen `version.json`.

## Componentes
- `app.js`: motor de lectura del Excel, composición y render de resultados.
- `picker-overlay.js`: capa de overlay del selector para móvil y escritorio.
- `version.js`: badge de versión y panel de revisión.
- `style.css`: interfaz principal.
- `version.css`: badge y panel de versión.

## Reglas base
- No se permiten campeones repetidos.
- Cada rol usa su propia tabla.
- La interfaz debe mantenerse usable en móvil, tablet y escritorio.
- Cualquier cambio debe validarse con una auditoría visual y funcional.
