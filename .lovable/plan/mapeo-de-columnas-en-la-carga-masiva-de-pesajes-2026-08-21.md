# Mapeo de columnas en la carga masiva de pesajes

Hoy la carga masiva de pesajes (`BulkWeighingUpload`) detecta las columnas sola, con una lista fija de alias (`EID`, `peso`, `Weight`, `fecha`, `Date`, etc.). Si la balanza exporta un encabezado que no está en esa lista (por ejemplo "Nro Caravana", "Peso final kg", "Fecha pesada"), la columna se ignora en silencio: las filas quedan con peso 0 o "animal no encontrado" y el usuario no entiende por qué.

La solución es agregar un paso de mapeo manual, igual al que ya usa la carga de animales por Excel.

## Nuevo flujo

```text
1. Subir archivo  ->  2. Mapear columnas (NUEVO)  ->  3. Validar y revisar  ->  4. Confirmar
```

### Paso 2 — Mapear columnas
- Se leen los encabezados reales del archivo y se muestra una fila por campo del sistema:
  - Caravana visual (id_tag)
  - Caravana electrónica / EID
  - Peso (kg) — obligatorio
  - Fecha
  - Notas
- Cada campo tiene un desplegable con las columnas del archivo + opción "Ignorar".
- El mapeo se pre-selecciona automáticamente con los alias actuales, así que en los archivos que ya funcionan el usuario solo confirma y sigue.
- Vista previa de las primeras 3 filas con los valores tal como quedarían mapeados, para detectar de un vistazo si una columna quedó cruzada.
- Validaciones antes de continuar: Peso debe estar mapeado, y al menos uno de Caravana visual o EID. Aviso si una misma columna se asigna a dos campos.
- Botón "Volver" para cambiar de archivo.

### Paso 3 — Validación (sin cambios de lógica)
Se mantiene todo lo actual: normalización de dígitos para EID, coincidencia por sufijo, guardas de ambigüedad, fechas locales (sin corrimiento de zona horaria), decimales con coma, agrupación por fecha al guardar, reporte de errores descargable.

## Detalle técnico

- Archivo: `src/components/activities/BulkWeighingUpload.tsx`.
- El parseo se separa en dos etapas: primero obtener `headers[]` + `rawRows[]` (CSV con Papa, XLSX con `sheet_to_json`), y luego aplicar el mapeo elegido para producir las filas de pesaje. `mapRow` pasa a recibir el mapeo en vez de adivinar; los alias actuales se reutilizan solo para la pre-selección.
- Los pasos se renumeran (el actual paso 2 de revisión pasa a 3, el 3 a 4) manteniendo intacto el resto del diálogo, los estilos y el layout móvil.
- La plantilla descargable y las hojas de ejemplo ("Simple" y "Bascula") no cambian.
- Textos nuevos agregados a `activities.json` en es, en y pt (títulos del paso, nombres de campos, "Ignorar", errores de mapeo).

Sin cambios de base de datos, de RLS ni de rutas.
