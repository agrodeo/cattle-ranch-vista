# Rediseño de la lógica de puntaje del Ranking

## Problemas detectados en la lógica actual

Revisando `src/lib/animalScore.ts` y `src/hooks/useHerdRanking.ts`:

1. **Salud pesa 0.** `MALE_WEIGHTS` y `FEMALE_WEIGHTS` tienen `health: 0`, pero la UI muestra el puntaje de salud. Se calcula sanidad (vacunas + condición corporal) y no afecta el resultado.
2. **Longevidad castiga por edad, no por desempeño.** Solo mira edad y CC: un ternero y una vaca de 8 años reciben puntajes fijos por rango de edad, sin considerar partos acumulados ni permanencia productiva. Para machos pesa 25% del total, lo que premia la edad en lugar de la productividad.
3. **Comparación contra benchmark absoluto de raza.** Producción usa `dailyGain.good` y `weaningWeight.good` de la raza, sin ajustar por categoría/edad ni sexo: los terneros con destete reciente y los toros adultos se miden con la misma vara y quedan sistemáticamente arriba o abajo.
4. **Reproducción solo para hembras.** Los toros no tienen componente reproductivo, aunque el sistema ya guarda servicios, preñeces logradas por toro (`toro_servicio_id`), IA y DEPs. Eso vuelve el ranking de machos casi puramente de peso.
5. **Puntajes no comparables entre categorías.** El orden global mezcla vacas, vaquillonas, terneros y toros con pesos distintos por sexo, así que "el #1 del rodeo" no significa lo mismo según qué categoría domina el listado.
6. **Ternera/Vaquillona sin datos reproductivos quedan penalizadas** vía `hasEnoughData >= 2` dimensiones: muchas hembras jóvenes caen a "datos insuficientes" y desaparecen del ranking.
7. **Ratios frágiles.** `successfulPregnancies / totalServices` con 1 solo servicio da 0 o 10 (sin suavizado), y `daysOpen / 45` es lineal sin piso realista.

## Rediseño propuesto

### A. Pesos por categoría, no por sexo
Reemplazar los dos juegos de pesos por una matriz por categoría derivada de sexo + edad (ya existe `deriveCategory`):

| Categoría | Producción | Reproducción | Salud | Genética | Longevidad |
|---|---|---|---|---|---|
| Ternero/Ternera (<12m) | 0.60 | 0 | 0.20 | 0.20 | 0 |
| Novillito (12-24m) | 0.65 | 0 | 0.20 | 0.15 | 0 |
| Vaquillona (12-24m) | 0.40 | 0.25 (precocidad) | 0.20 | 0.15 | 0 |
| Vaca (>24m) | 0.20 | 0.45 | 0.15 | 0.10 | 0.10 |
| Toro (>24m) | 0.40 | 0.25 | 0.15 | 0.20 | 0 |

Los pesos se renormalizan solo entre las dimensiones con datos (se conserva el mecanismo actual).

### B. Producción relativa al grupo par
Puntaje = 60% percentil dentro del grupo par (misma categoría + raza cuando hay ≥5 animales comparables) + 40% benchmark absoluto de raza. Si el grupo par es chico, se usa 100% benchmark. Esto vuelve justos los rankings de rodeos chicos y de razas mixtas, y evita que la categoría defina el orden. Prioridad a ADG (métrica principal del negocio), con peso ajustado por confiabilidad: ADG basado en 1 pesaje se atenúa hacia la media.

### C. Reproducción por categoría
- **Vaca:** tasa de preñez suavizada (Laplace: `(éxitos+1)/(servicios+2)`), intervalo entre partos, crías vivas / preñeces, y días abiertos con función escalonada (≤90 excelente, 90-150 medio, >150 bajo).
- **Vaquillona:** precocidad — preñada/servida antes de los 24 meses puntúa alto; sin servicio y con edad <15 meses no penaliza (dimensión sin datos).
- **Toro:** tasa de preñez del rodeo servido por él (`animals.toro_servicio_id` + `preñeces`), cantidad de crías vivas y circunferencia escrotal vs benchmark.
- **Terneros/Novillitos:** sin dimensión reproductiva.

### D. Salud con peso real
Se activa (0.15-0.20 según categoría) con: cobertura de vacunación, vacunas vencidas (penalización acotada), condición corporal en rango objetivo. Si el rodeo no tiene requerimientos de vacunación configurados, la dimensión queda sin datos y no distorsiona.

### E. Longevidad solo donde aplica
Se limita a vacas: años reproductivos activos, partos acumulados por año productivo y permanencia. Para el resto queda sin datos (peso 0) en lugar de repartir puntos por edad.

### F. Genética con DEPs
Se suma el aporte de `animal_deps` cuando existe (percentil de DEPs frente al resto del rodeo) al puntaje actual de registro/ADN/padres, en lugar de premiar solo la carga de datos de pedigrí.

### G. Datos insuficientes más tolerante
`hasEnoughData` pasa a exigir: al menos una dimensión con datos que represente ≥50% del peso de la categoría. Así una ternera con solo pesos entra al ranking con puntaje válido, y se muestra el nivel de confianza (`dataCompleteness`) junto al puntaje.

### H. Ranking global comparable
El listado sin filtro de categoría ordena por percentil dentro de la categoría (no por puntaje bruto), y el puntaje visible sigue siendo el 0-10. Con filtro de categoría el orden es directo por puntaje. Esto elimina el sesgo de mezclar categorías.

## Detalles técnicos

- `src/lib/animalScore.ts`: matriz `CATEGORY_WEIGHTS`, nuevas funciones `scoreProduction` (con percentil de grupo par), `scoreReproduction` ramificada por categoría, `scoreLongevity` restringida a vacas, y salida extra `confidence` + `peerGroupSize`.
- `src/hooks/useHerdRanking.ts`: cálculo en dos pasadas (primero métricas crudas por animal para armar los grupos pares y percentiles, luego el puntaje final), carga de `animal_deps` y de métricas de toro por servicio, y ordenamiento por percentil de categoría cuando no hay filtro.
- `src/components/reports/RankingAnalytics.tsx`: mostrar Salud como columna/celda con valor real, ocultar Longevidad para categorías donde no aplica, indicador de confianza del dato. Sin cambios de layout ni de rutas.
- Sin migraciones: se usan tablas existentes (`animals`, `preñeces`, `animal_deps`, `animal_vaccines`, `cabaña_vaccination_requirements`).
- `AnimalScoreBadge` y el perfil del animal se mantienen compatibles: la interfaz `AnimalScore` conserva todos sus campos actuales.
