Ajusto el plan: la carga manual múltiple no debe ser una tabla “simple” con pocos campos, sino un sistema rápido que permita cargar varios animales y, para cada uno, completar toda la información disponible en la ficha de animal.

Propuesta de implementación:

1. Crear un modo “Carga manual múltiple”
- En “Agregar Animal”, cuando sea alta nueva, mostrar una interfaz para sumar varios animales antes de guardar.
- Mantener edición individual sin cambios para animales existentes.
- La experiencia será:

```text
Carga manual múltiple
[Valores comunes opcionales]
[Tabla rápida con campos principales]
[Detalle expandible por animal para completar toda la ficha]
[Cargar X animales]
```

2. Tabla rápida para acelerar la carga
La tabla principal tendrá los campos que normalmente se repiten o se cargan rápido:
- Identificación / caravana
- Caravana electrónica
- Nombre
- Sexo
- Raza
- Fecha de nacimiento
- Peso nacimiento
- Estado
- Corral
- Madre
- Padre

Cada fila tendrá:
- Editar detalle
- Duplicar fila, útil cuando varios animales comparten datos
- Eliminar fila

3. Detalle completo por animal
Cada fila tendrá un panel expandible o diálogo de “Detalle completo” para cargar toda la información posible, incluyendo:
- Datos básicos: identificación, electrónica, nombre, sexo, raza, nacimiento, estado.
- Genealogía: madre, padre, raza de madre/padre, registros de madre/padre.
- Registro racial: nivel de registro, datos específicos para Braford/Brangus/Angus cuando aplique.
- Fenotipo: mocho/cuernos, color/pelaje, condición corporal.
- Pesos/productividad: peso nacimiento, destete, final, actual, fecha destete, circunferencia escrotal para machos.
- Ubicación: corral.
- Reproducción si corresponde: preñez, fecha probable de parto y campos reproductivos ya disponibles en la tabla `animals` cuando sean seguros de editar desde alta.
- Observaciones.
- Castrado para machos.

4. Valores comunes para cargar más rápido
Agregar una sección opcional de “Aplicar a nuevas filas” para no repetir datos:
- Raza por defecto
- Sexo por defecto
- Fecha nacimiento por defecto
- Estado por defecto
- Corral por defecto
- Madre/padre por defecto si aplica

Al tocar “Agregar fila”, la nueva fila ya viene con esos valores.

5. Validaciones completas antes de guardar
- Campos requeridos por fila: identificación, sexo y raza.
- Fecha de nacimiento no futura.
- Pesos numéricos válidos y no negativos.
- Condición corporal dentro de valores permitidos.
- Madre y padre no pueden ser el mismo animal.
- IDs duplicados dentro de la tabla.
- IDs ya existentes en la cabaña.
- Validar límite del plan considerando cuántos animales activos se van a agregar.
- Respetar RLS y validación server-side existente: la inserción seguirá pasando por Supabase con `cabaña_id` del usuario y las políticas actuales.

6. Guardado online/offline
- Online: insertar todos los animales de una vez con `.insert([...])`.
- Offline: crear cada animal en IndexedDB y encolar un `ANIMAL_INSERT` por animal, sin duplicar eventos.
- Mantener el patrón outbox existente para sincronización.

7. Mobile
- En mobile no usar una tabla ancha que genere scroll horizontal.
- Usar tarjetas compactas por animal:
  - Encabezado con ID, sexo, raza.
  - Campos rápidos visibles.
  - “Completar detalle” para abrir todos los campos.
- Botón fijo inferior: “Cargar X animales”.

8. Traducciones
Agregar textos en español, inglés y portugués para:
- Carga manual múltiple
- Valores comunes
- Agregar animal/fila
- Duplicar
- Completar detalle
- Cargar X animales
- Errores por fila
- Duplicados
- Límite del plan superado

Archivos a modificar:
- `src/components/animals/AnimalFormDialog.tsx`
- `src/components/mobile/flows/ManualAnimalForm.tsx`
- `src/i18n/locales/es/animals.json`
- `src/i18n/locales/en/animals.json`
- `src/i18n/locales/pt/animals.json`

No requiere cambios de base de datos. Se usan las columnas existentes de `animals` y se respeta la arquitectura actual de Supabase, RLS, plan limits y offline/outbox.