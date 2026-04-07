-- Procedimientos almacenados para consultas alfanuméricas
-- Estos procedimientos aceptan parámetros de filtro y aplican la lógica de filtrado internamente

-- Eliminar función existente si existe
DROP FUNCTION IF EXISTS consulta_fichas(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER);

-- Función para consultar Fichas
CREATE FUNCTION consulta_fichas(
    p_schema_name TEXT,
    p_nro_ficha TEXT DEFAULT NULL,
    p_npn TEXT DEFAULT NULL,
    p_matricula_inmobiliaria TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 1000,
    p_offset INTEGER DEFAULT 0
)
RETURNS SETOF RECORD AS $$
DECLARE
    v_sql TEXT;
    v_where_conditions TEXT := '';
    v_schema_quoted TEXT := quote_ident(p_schema_name);
BEGIN
    -- Construir condiciones WHERE dinámicamente
    IF p_nro_ficha IS NOT NULL AND p_nro_ficha != '' THEN
        v_where_conditions := v_where_conditions || ' AND predio.n_ficha::varchar(255) = ' || quote_literal(p_nro_ficha);
    END IF;
    
    IF p_npn IS NOT NULL AND p_npn != '' THEN
        v_where_conditions := v_where_conditions || ' AND predio.numero_predial LIKE ' || quote_literal('%' || p_npn || '%');
    END IF;
    
    IF p_matricula_inmobiliaria IS NOT NULL AND p_matricula_inmobiliaria != '' THEN
        v_where_conditions := v_where_conditions || ' AND predio.matricula_inmobiliaria::varchar(255) = ' || quote_literal(p_matricula_inmobiliaria);
    END IF;
    
    -- Construir la consulta SQL completa
        v_sql := '
        SELECT
            predio.t_id,
            MAX(terreno.t_id) as id_terreno,
            MAX(predio.n_ficha::varchar(255)) as "NroFicha",
            MAX(predio.local_id) as "NumCedulaCatastral",
            MAX(predio.departamento) as "DepartamentoPredio",
            MAX(predio.municipio) as "MunicipioPredio",
            MAX(predio.matricula_inmobiliaria::varchar(255)) as "MatriculaInmobiliaria",
            MAX(predio.codigo_orip) as circulo,
            MAX(sisantiguo.libro) as "Libro",
            MAX(sisantiguo.tomo) as "Tomo",
            MAX(sisantiguo.pagina) as "Pagina",
            case
                when MAX(derechotipo.ilicode)= ''Dominio'' then ''1|DOMINIO (TRADICION)''
                when MAX(derechotipo.ilicode)= ''Posesion'' then ''2|POSESIÓN''
                when MAX(derechotipo.ilicode)= ''Ocupacion'' then ''5|OCUPACIÓN''
            end as "ModoAdquisicion",
            case
                when MAX(coluabt.ilicode)= ''Predio.Privado'' then ''Predio.Privado.Privado''
                else MAX(coluabt.ilicode)
            end as "PredioLcTipo",
            case
                when MAX(condicion.ilicode)= ''NPH'' then ''1|NPH (0)''
                when MAX(condicion.ilicode)= ''Informal'' then ''12|INFORMAL (2)''
                when MAX(condicion.ilicode)= ''Bien_Uso_Publico'' then ''13|BIEN DE USO PUBLICO (3)''
                when MAX(condicion.ilicode)= ''Via'' then ''11|VIA (4)''
                when MAX(condicion.ilicode)= ''PH.Matriz'' then ''2|RPH''
                when MAX(condicion.ilicode)= ''PH.Unidad_Predial'' then ''2|RPH''
                when MAX(condicion.ilicode)= ''Condominio.Matriz'' then ''3|Parcelacion''
                when MAX(condicion.ilicode)= ''Condominio.Unidad_Predial'' then ''3|Parcelacion''
            end as "CaracteristicaPredio",
            max(tipodir.ilicode) as "TipoDireccion",
            CASE
            WHEN MAX(tipodir.ilicode) = ''No_Estructurada'' THEN MAX(direccion.nombre_predio)
            ELSE
                TRIM(CONCAT_WS('' '',
                    MAX(CASE
                        WHEN clasevia.itfcode = ''0'' THEN ''AC''
                        WHEN clasevia.itfcode = ''1'' THEN ''ACR''
                        WHEN clasevia.itfcode = ''2'' THEN ''AV''
                        WHEN clasevia.itfcode = ''3'' THEN ''AU''
                        WHEN clasevia.itfcode = ''4'' THEN ''CIR''
                        WHEN clasevia.itfcode = ''5'' THEN ''CL''
                        WHEN clasevia.itfcode = ''6'' THEN ''CR''
                        WHEN clasevia.itfcode = ''7'' THEN ''DG''
                        WHEN clasevia.itfcode = ''8'' THEN ''TV''
                        WHEN clasevia.itfcode = ''9'' THEN ''CQ''
                    END),
                    MAX(direccion.valor_via_principal),
                    MAX(direccion.letra_via_principal),
                    MAX(sector.ilicode),
                    CASE 
                        WHEN MAX(direccion.valor_via_principal) IS NOT NULL THEN ''N'' 
                        ELSE NULL 
                    END,
                    MAX(direccion.valor_via_generadora),
                    MAX(direccion.letra_via_generadora),
                    MAX(sectorp.ilicode),
                    CASE 
                        WHEN MAX(direccion.numero_predio) IS NOT NULL THEN ''-'' 
                        ELSE NULL 
                    END,
                    MAX(direccion.numero_predio),
                    MAX(direccion.complemento)
                ))
        END AS "DireccionReal",
            MAX(predio.nombre) as "DireccionNombre",
            case
                when MAX(destino.ilicode)= ''Acuicola'' then ''60|ACUICOLA''
                when MAX(destino.ilicode)= ''Agricola'' then ''24|AGRICOLA''
                when MAX(destino.ilicode)= ''Agroindustrial'' then ''28|AGROINDUSTRIAL''
                when MAX(destino.ilicode)= ''Agroforestal'' then ''61|AGROFORESTAL''
                when MAX(destino.ilicode)= ''Comercial'' then ''3|COMERCIAL''
                when MAX(destino.ilicode)= ''Cultural'' then ''6|CULTURAL''
                when MAX(destino.ilicode)= ''Educativo'' then ''27|EDUCATIVO''
                when MAX(destino.ilicode)= ''Forestal'' then ''30|FORESTAL''
                when MAX(destino.ilicode)= ''Habitacional'' then ''1|HABITACIONAL''
                when MAX(destino.ilicode)= ''Industrial'' then ''2|INDUSTRIAL''
                when MAX(destino.ilicode)= ''Infraestructura_Asociada_Produccion_Agropecuaria'' then ''62|INFRAESTRUCTURA_ASOCIADA_PRODUCCIÓN_AGROPECUARIA''
                when MAX(destino.ilicode)= ''Infraestructura_Hidraulica'' then ''63|INFRAESTRUCTURA HIDRAULICA''
                when MAX(destino.ilicode)= ''Infraestructura_Saneamiento_Basico'' then ''64|INFRAESTRUCTURA SANEAMIENTO BÁSICO''
                when MAX(destino.ilicode)= ''Infraestructura_Seguridad'' then ''67|INFRAESTRUCTURA SEGURIDAD''
                when MAX(destino.ilicode)= ''Infraestructura_Transporte'' then ''65|INFRAESTRUCTURA TRANSPORTE''
                when MAX(destino.ilicode)= ''Institucional'' then ''9|INSTITUCIONAL''
                when MAX(destino.ilicode)= ''Mineria_Hidrocarburos'' then ''5|MINEROS_HIDROCARBUROS''
                when MAX(destino.ilicode)= ''Lote_Urbanizable_No_Urbanizado'' then ''13|LOTE URBANIZABLE NO URBANIZADO''
                when MAX(destino.ilicode)= ''Lote_Urbanizado_No_Construido'' then ''12|LOTE URBANIZADO NO CONSTRUIDO''
                when MAX(destino.ilicode)= ''Lote_No_Urbanizable'' then ''14|LOTE NO URBANIZABLE''
                when MAX(destino.ilicode)= ''Pecuario'' then ''25|PECUARIO''
                when MAX(destino.ilicode)= ''Recreacional'' then ''7|RECREACIONAL''
                when MAX(destino.ilicode)= ''Religioso'' then ''29|RELIGIOSO''
                when MAX(destino.ilicode)= ''Salubridad'' then ''8|SALUBRIDAD''
                when MAX(destino.ilicode)= ''Servicios_Funerarios'' then ''66|SERVICIOS_FUNERARIOS''
                when MAX(destino.ilicode)= ''Uso_Publico'' then ''19|USO PUBLICO''
            end as "DestinoEcconomico",
            MAX(terreno.area_terreno)::NUMERIC as "AreaTotalTerreno",
            COALESCE(SUM(distinct caracteristica.area_construida), 0)::NUMERIC as "AreaTotalConstruida",
            COALESCE(sum(unidad.area_construida), 0)::NUMERIC as "AreaTotalUnidad",
            MAX(left(predio.numero_predial, 22)) as "NpnTerreno",
            MAX(predio.numero_predial) as "Npn",
            MAX(SUBSTRING(predio.numero_predial, 1, 2)) as "Departamento",
            MAX(SUBSTRING(predio.numero_predial, 3, 3)) as "Municipio",
            MAX(SUBSTRING(predio.numero_predial, 6, 2)) as "Zona",
            MAX(SUBSTRING(predio.numero_predial, 8, 2)) as "Sector",
            MAX(SUBSTRING(predio.numero_predial, 10, 2)) as "Comuna",
            MAX(SUBSTRING(predio.numero_predial, 12, 2)) as "Barrio",
            MAX(SUBSTRING(predio.numero_predial, 14, 4)) as "Manzana o Vereda",
            MAX(SUBSTRING(predio.numero_predial, 18, 4)) as "Terreno",
            MAX(SUBSTRING(predio.numero_predial, 22, 1)) as "Condicion",
            MAX(SUBSTRING(predio.numero_predial, 23, 2)) as "Edificio",
            MAX(SUBSTRING(predio.numero_predial, 25, 2)) as "Piso",
            MAX(SUBSTRING(predio.numero_predial, 27, 4)) as "Unidad Predial",
            MAX(dph.area_total_terreno)::TEXT as "AreaTotalLote",
            MAX(dph.area_total_terreno_comun)::TEXT as "AreaLoteComun",
            (case
                when MAX(condicion.ilicode)=''Condominio.Unidad_Predial'' then MAX(terreno.area_terreno)
                when MAX(condicion.ilicode)= ''PH.Unidad_Predial'' then MAX(terreno.area_terreno)
                else NULL
            end)::TEXT as "AreaLotePrivada",
            MAX(dph.numero_torres)::TEXT as "TotalEdificios",
            MAX(dph.total_unidades_privadas)::TEXT as "UnidadesEnRPH",
            null as "ApartamentosOCasas",
            null as locales,
            null as "GarajesCubiertos",
            null as "GarajesDescubiertos",
            null as "CuartosUtiles",
            null as "Radicado",
            null as "PorcentajeLitigio",
            (MAX(copropiedad.coeficiente) * 100)::TEXT as "CoeficienteCopropiedad",
            null as "UnidadPredial"
        FROM ' || v_schema_quoted || '.lc_predio as predio
        join ' || v_schema_quoted || '.lc_destinacioneconomicatipo as destino on
            predio.destinacion_economica = destino.t_id
        join ' || v_schema_quoted || '.col_unidadadministrativabasicatipo as coluabt on
            predio.tipo = coluabt.t_id
        join ' || v_schema_quoted || '.lc_condicionprediotipo as condicion on
            predio.condicion_predio = condicion.t_id
        left join ' || v_schema_quoted || '.lc_derecho as derecho on
            predio.t_id = derecho.unidad
        left join ' || v_schema_quoted || '.lc_derechotipo as derechotipo on
            derechotipo.t_id = derecho.tipo
        left join ' || v_schema_quoted || '.cr_predio_copropiedad as copropiedad on
            copropiedad.unidad_predial = predio.t_id
        left join ' || v_schema_quoted || '.extreferenciaregistralsistemaantiguo sisantiguo on
            predio.t_id = sisantiguo.lc_predio_referencia_registral_sistema_antiguo
        left join ' || v_schema_quoted || '.col_uebaunit as ueba on
            predio.t_id = ueba.baunit
        left join ' || v_schema_quoted || '.cr_terreno as terreno on
            terreno.t_id = ueba.ue_cr_terreno
        left join ' || v_schema_quoted || '.cr_datosphcondominio as dph on
            predio.t_id = dph.lc_predio
        left join ' || v_schema_quoted || '.cr_unidadconstruccion unidad on
            ueba.ue_cr_unidadconstruccion = unidad.t_id
        left join ' || v_schema_quoted || '.cr_caracteristicasunidadconstruccion caracteristica on
            unidad.cr_caracteristicasunidadconstruccion = caracteristica.t_id
        left join ' || v_schema_quoted || '.extdireccion direccion on
            predio.t_id = lc_predio_direccion
        left join ' || v_schema_quoted || '.extdireccion_clase_via_principal clasevia on
            direccion.clase_via_principal = clasevia.t_id
        left join ' || v_schema_quoted || '.extdireccion_sector_ciudad sector on
            direccion.sector_ciudad = sector.t_id
        left join ' || v_schema_quoted || '.extdireccion_tipo_direccion tipodir on direccion.tipo_direccion =tipodir.t_id
        left join ' || v_schema_quoted || '.extdireccion_sector_predio sectorp on direccion.sector_predio =sectorp.t_id
        WHERE 1=1' || v_where_conditions || '
        group by
            predio.t_id
        ORDER BY predio.t_id
        LIMIT ' || p_limit || ' OFFSET ' || p_offset;
    
    -- Ejecutar la consulta dinámica
    RETURN QUERY EXECUTE v_sql;
END;
$$ LANGUAGE plpgsql;

-- Eliminar función wrapper existente si existe
DROP FUNCTION IF EXISTS consulta_fichas_wrapper(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER);

-- Crear función wrapper con tipos explícitos para facilitar el uso
CREATE FUNCTION consulta_fichas_wrapper(
    p_schema_name TEXT,
    p_nro_ficha TEXT DEFAULT NULL,
    p_npn TEXT DEFAULT NULL,
    p_matricula_inmobiliaria TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 1000,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    t_id BIGINT,
    id_terreno BIGINT,
    "NroFicha" TEXT,
    "NumCedulaCatastral" TEXT,
    "Departamento" TEXT,
    "Municipio" TEXT,
    "MatriculaInmobiliaria" TEXT,
    circulo TEXT,
    "Libro" TEXT,
    "Tomo" TEXT,
    "Pagina" TEXT,
    "ModoAdquisicion" TEXT,
    "PredioLcTipo" TEXT,
    "CaracteristicaPredio" TEXT,
    "TipoDireccion" TEXT,
    "DireccionReal" TEXT,
    "DireccionNombre" TEXT,
    "DestinoEcconomico" TEXT,
    "AreaTotalTerreno" NUMERIC,
    "AreaTotalConstruida" NUMERIC,
    "AreaTotalUnidad" NUMERIC,
    "NpnTerreno" TEXT,
    "Npn" TEXT,
    "Zona" TEXT,
    "Sector" TEXT,
    "Comuna" TEXT,
    "Barrio" TEXT,
    "Manzana o Vereda" TEXT,
    "Terreno" TEXT,
    "Condicion" TEXT,
    "Edificio" TEXT,
    "Piso" TEXT,
    "Unidad Predial" TEXT,
    "AreaTotalLote" TEXT,
    "AreaLoteComun" TEXT,
    "AreaLotePrivada" TEXT,
    "TotalEdificios" TEXT,
    "UnidadesEnRPH" TEXT,
    "ApartamentosOCasas" TEXT,
    locales TEXT,
    "GarajesCubiertos" TEXT,
    "GarajesDescubiertos" TEXT,
    "CuartosUtiles" TEXT,
    "Radicado" TEXT,
    "PorcentajeLitigio" TEXT,
    "CoeficienteCopropiedad" TEXT,
    "UnidadPredial" TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM consulta_fichas(p_schema_name, p_nro_ficha, p_npn, p_matricula_inmobiliaria, p_limit, p_offset)
    AS t(
        t_id BIGINT,
        id_terreno BIGINT,
        "NroFicha" TEXT,
        "NumCedulaCatastral" TEXT,
        "Departamento" TEXT,
        "Municipio" TEXT,
        "MatriculaInmobiliaria" TEXT,
        circulo TEXT,
        "Libro" TEXT,
        "Tomo" TEXT,
        "Pagina" TEXT,
        "ModoAdquisicion" TEXT,
        "PredioLcTipo" TEXT,
        "CaracteristicaPredio" TEXT,
        "TipoDireccion" TEXT,
        "DireccionReal" TEXT,
        "DireccionNombre" TEXT,
        "DestinoEcconomico" TEXT,
        "AreaTotalTerreno" NUMERIC,
        "AreaTotalConstruida" NUMERIC,
        "AreaTotalUnidad" NUMERIC,
        "NpnTerreno" TEXT,
        "Npn" TEXT,
        "Zona" TEXT,
        "Sector" TEXT,
        "Comuna" TEXT,
        "Barrio" TEXT,
        "Manzana o Vereda" TEXT,
        "Terreno" TEXT,
        "Condicion" TEXT,
        "Edificio" TEXT,
        "Piso" TEXT,
        "Unidad Predial" TEXT,
        "AreaTotalLote" TEXT,
        "AreaLoteComun" TEXT,
        "AreaLotePrivada" TEXT,
        "TotalEdificios" TEXT,
        "UnidadesEnRPH" TEXT,
        "ApartamentosOCasas" TEXT,
        locales TEXT,
        "GarajesCubiertos" TEXT,
        "GarajesDescubiertos" TEXT,
        "CuartosUtiles" TEXT,
        "Radicado" TEXT,
        "PorcentajeLitigio" TEXT,
        "CoeficienteCopropiedad" TEXT,
        "UnidadPredial" TEXT
    );
END;
$$ LANGUAGE plpgsql;

