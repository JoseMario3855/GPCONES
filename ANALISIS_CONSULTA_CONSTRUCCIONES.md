# Análisis de la Consulta de Construcciones

## Estructura de la Consulta

### 1. SELECT - Columnas que devuelve:

```sql
SELECT 
    caracteristica.t_id,
    max(predio.n_ficha) as "NroFicha", 
    max(unidad.t_id) as "secuencia",
    max(predio.numero_predial) as "Npn",  ← COLUMNA CLAVE
    MAX(SUBSTRING(predio.numero_predial, 22, 1)) as "Condicion",
    max(caracteristica.identificador) as "NumeroConstruccion",
    Max(predio.n_ficha||'-'||caracteristica.identificador) as "FHNC",
    -- ... muchas más columnas
```

**Columnas principales para filtros:**
- `"NroFicha"` - viene de `predio.n_ficha`
- `"Npn"` - viene de `predio.numero_predial` ← **ESTA ES LA QUE NECESITAMOS**
- `"NumeroConstruccion"` - viene de `caracteristica.identificador`

### 2. FROM y JOINs - Relaciones de tablas:

```sql
FROM {esquema}.cr_unidadconstruccion unidad
LEFT JOIN {esquema}.cr_caracteristicasunidadconstruccion caracteristica 
    ON unidad.cr_caracteristicasunidadconstruccion = caracteristica.t_id
LEFT JOIN {esquema}.cr_unidadconstrucciontipo constipo 
    ON caracteristica.tipo_unidad_construccion = constipo.t_id
LEFT JOIN {esquema}.cr_usouconstipo uso 
    ON caracteristica.uso = uso.t_id
LEFT JOIN {esquema}.cr_calificacionconvencional convencional 
    ON caracteristica.t_id = convencional.cr_carascteristicasunidadconstrccn_cr_clfccncnstrccion
LEFT JOIN {esquema}.cr_calificacionnoconvencional noconvencional 
    ON caracteristica.t_id = noconvencional.cr_carascteristicasunidadconstrccn_cr_clfccncnstrccion
LEFT JOIN {esquema}.cr_anexotipo anexo 
    ON noconvencional.tipo_anexo = anexo.t_id
LEFT JOIN {esquema}.cr_construccion construccion 
    ON unidad.cr_construccion = construccion.t_id
LEFT JOIN {esquema}.col_uebaunit ueba 
    ON unidad.t_id = ueba.ue_cr_unidadconstruccion
LEFT JOIN {esquema}.lc_predio predio 
    ON ueba.baunit = predio.t_id  ← AQUÍ ESTÁ EL PREDIO CON numero_predial
```

**Cadena de relaciones:**
1. `cr_unidadconstruccion` (unidad) - tabla principal
2. → `cr_caracteristicasunidadconstruccion` (caracteristica)
3. → `col_uebaunit` (ueba) - relación unidad-construcción con predio
4. → `lc_predio` (predio) - **AQUÍ ESTÁ numero_predial**

### 3. GROUP BY:

```sql
GROUP BY caracteristica.t_id
```

## Problema Identificado

La columna `"Npn"` viene de `predio.numero_predial`, pero:
- Es un **LEFT JOIN**, por lo que puede ser NULL si no hay relación con predio
- Está dentro de un `max()`, por lo que siempre devuelve un valor (aunque sea NULL)
- La consulta se agrupa por `caracteristica.t_id`

**El problema:** Cuando ejecutamos la consulta de prueba con `LIMIT 1` para detectar columnas:
- Puede que no haya datos
- Puede que el LEFT JOIN con predio no devuelva resultados
- Pero la columna `"Npn"` **SÍ DEBE EXISTIR** en el resultado porque está en el SELECT

## Solución

La columna `"Npn"` **SIEMPRE** debe existir en el resultado de la consulta de Construcciones porque está explícitamente en el SELECT. El problema puede ser:

1. La consulta de prueba falla antes de ejecutarse
2. Los metadatos no se están capturando correctamente
3. Hay un problema con cómo se está envolviendo la consulta en la subconsulta

**Solución propuesta:** Confiar en que la columna existe según el archivo y usarla directamente, sin intentar detectarla primero.


