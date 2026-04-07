SELECT * FROM (select 
		caracteristica.t_id,
        max(predio.n_ficha) as "NroFicha", 
        max(unidad.t_id) as "secuencia",
        max(predio.numero_predial) as "Npn",
        MAX(SUBSTRING(predio.numero_predial, 22, 1)) as "Condicion",        
        
        max(caracteristica.identificador) as "NumeroConstruccion",
        Max(predio.n_ficha||'-'||caracteristica.identificador) as "FHNC",
        max(case 
                when constipo.ilicode='Residencial' then 'R'
                when constipo.ilicode='Industrial' then 'I'
                when constipo.ilicode='Comercial' then 'C'
                when constipo.ilicode='Institucional' then 'T'
                when constipo.ilicode = 'Anexo' then 'N'
            end) as
            "TipoConstruccion", 
            max(CASE
            
            WHEN uso.ilicode = 'Residencial.Apartamentos_4_y_mas_pisos_en_PH' THEN '800|Residencial.Apartamentos_4_y_mas_pisos_en_PHv'
            WHEN uso.ilicode = 'Residencial.Apartamentos_4_y_mas_pisos' THEN '802|Residencial.Apartamentos_Mas_De_4_Pisos'
            WHEN uso.ilicode = 'Residencial.Barracas' THEN '803|Residencial.Barracas'
            WHEN uso.ilicode = 'Residencial.Casa_Elbas' THEN '804|Residencial.Casa_Elbas'
            WHEN uso.ilicode = 'Residencial.Depositos_Lockers' THEN '805|Residencial.Depositos_Lockers'
            WHEN uso.ilicode = 'Residencial.Garajes_Cubiertos' THEN '806|Residencial.Garajes_Cubiertos'
            WHEN uso.ilicode = 'Residencial.Garajes_En_PH' THEN '807|Residencial.Garajes_En_PH'
            WHEN uso.ilicode = 'Residencial.Salon_Comunal' THEN '808|Residencial.Salon_Comunal'
            WHEN uso.ilicode = 'Residencial.Secadero_Ropa' THEN '809|Residencial.Secadero_Ropa'
            WHEN uso.ilicode = 'Residencial.Vivienda_Colonial' THEN '810|Residencial.Vivienda_Colonial'
            WHEN uso.ilicode = 'Residencial.Vivienda_Colonial_en_PH' THEN '910|Residencial.Vivienda_Colonial_en_PH'
            WHEN uso.ilicode = 'Residencial.Vivienda_Hasta_3_Pisos' THEN '811|Residencial.Vivienda_Hasta_3_Pisos'
            WHEN uso.ilicode = 'Residencial.Vivienda_Hasta_3_Pisos_En_PH' THEN '812|Residencial.Vivienda_Hasta_3_Pisos_En_PH'
            WHEN uso.ilicode = 'Residencial.Vivienda_Recreacional' THEN '813|Residencial.Vivienda_Recreacional'
            WHEN uso.ilicode = 'Residencial.Vivienda_Recreacional_En_PH' THEN '814|Residencial.Vivienda_Recreacional_En_PH'

            
            WHEN uso.ilicode = 'Comercial.Bodegas_Comerciales_Grandes_Almacenes' THEN '815|Comercial.Bodegas_Comerciales_Grandes_Almacenes'
            WHEN uso.ilicode = 'Comercial.Bodegas_Comerciales_en_PH' THEN '816|Comercial.Bodegas_Comerciales_en_PH'
            WHEN uso.ilicode = 'Comercial.Centros_Comerciales' THEN '817|Comercial.Centros_Comerciales'
            WHEN uso.ilicode = 'Comercial.Centros_Comerciales_en_PH' THEN '818|Comercial.Centros_Comerciales_en_PH'
            WHEN uso.ilicode = 'Comercial.Clubes_Casinos' THEN '819|Comercial.Clubes_Casinos'
            WHEN uso.ilicode = 'Comercial.Comercio' THEN '820|Comercial.Comercio'
            WHEN uso.ilicode = 'Comercial.Comercio_Colonial' THEN '821|Comercial.Comercio_Colonial'
            WHEN uso.ilicode = 'Comercial.Comercio_en_PH' THEN '822|Comercial.Comercio_en_PH'
            WHEN uso.ilicode = 'Comercial.Hotel_Colonial' THEN '823|Comercial.Hotel_Colonial'
            WHEN uso.ilicode = 'Comercial.Hoteles' THEN '824|Comercial.Hoteles'
            WHEN uso.ilicode = 'Comercial.Hoteles_en_PH' THEN '825|Comercial.Hoteles_en_PH'
            WHEN uso.ilicode = 'Comercial.Oficinas_Consultorios' THEN '826|Comercial.Oficinas_Consultorios'
            WHEN uso.ilicode = 'Comercial.Oficinas_Consultorios_Coloniales' THEN '827|Comercial.Oficinas_Consultorios_Coloniales'
            WHEN uso.ilicode = 'Comercial.Oficinas_Consultorios_en_PH' THEN '828|Comercial.Oficinas_Consultorios_en_PH'
            WHEN uso.ilicode = 'Comercial.Parque_Diversiones' THEN '829|Comercial.Parque_Diversiones'
            WHEN uso.ilicode = 'Comercial.Parqueaderos' THEN '830|Comercial.Parqueaderos'
            WHEN uso.ilicode = 'Comercial.Parqueaderos_en_PH' THEN '831|Comercial.Parqueaderos_en_PH'
            WHEN uso.ilicode = 'Comercial.Pensiones_y_Residencias' THEN '832|Comercial.Pensiones_y_Residencias'
            WHEN uso.ilicode = 'Comercial.Plaza_Mercado' THEN '833|Comercial.Plaza_Mercado'
            WHEN uso.ilicode = 'Comercial.Restaurante_Colonial' THEN '834|Comercial.Restaurante_Colonial'
            WHEN uso.ilicode = 'Comercial.Restaurantes' THEN '835|Comercial.Restaurantes'
            WHEN uso.ilicode = 'Comercial.Restaurantes_en_PH' THEN '836|Comercial.Restaurantes_en_PH'
            WHEN uso.ilicode = 'Comercial.Teatro_Cinemas' THEN '837|Comercial.Teatro_Cinemas'
            WHEN uso.ilicode = 'Comercial.Teatro_Cinemas_en_PH' THEN '838|Comercial.Teatro_Cinemas_en_PH'

            
            WHEN uso.ilicode = 'Industrial.Bodega_Casa_Bomba' THEN '839|Industrial.Bodega_Casa_Bomba'
            WHEN uso.ilicode = 'Industrial.Bodegas_Casa_Bomba_en_PH' THEN '840|Industrial.Bodegas_Casa_Bomba_en_PH'
            WHEN uso.ilicode = 'Industrial.Industrias' THEN '841|Industrial.Industrias'
            WHEN uso.ilicode = 'Industrial.Industrias_en_PH' THEN '842|Industrial.Industrias_en_PH'
            WHEN uso.ilicode = 'Industrial.Talleres' THEN '843|Industrial.Talleres'

            
            WHEN uso.ilicode = 'Institucional.Aulas_de_Clases' THEN '844|Institucional.Aulas_de_Clases'
            WHEN uso.ilicode = 'Institucional.Biblioteca' THEN '845|Institucional.Biblioteca'
            WHEN uso.ilicode = 'Institucional.Carceles' THEN '846|Institucional.Carceles'
            WHEN uso.ilicode = 'Institucional.Casas_de_Culto' THEN '847|Institucional.Casas_de_Culto'
            WHEN uso.ilicode = 'Institucional.Clinicas_Hospitales_Centros_Medicos' THEN '848|Institucional.Clinicas_Hospitales_Centros_Medicos'
            WHEN uso.ilicode = 'Institucional.Colegio_y_Universidades' THEN '849|Institucional.Colegio_y_Universidades'
            WHEN uso.ilicode = 'Institucional.Coliseos' THEN '850|Institucional.Coliseos'
            WHEN uso.ilicode = 'Institucional.Entidad_Educativa_Colonial_Colegio_Colonial' THEN '851|Institucional.Entidad_Educativa_Colonial_Colegio_Colonial'
            WHEN uso.ilicode = 'Institucional.Estadios' THEN '852|Institucional.Estadios'
            WHEN uso.ilicode = 'Institucional.Fuertes_y_Castillos' THEN '853|Institucional.Fuertes_y_Castillos'
            WHEN uso.ilicode = 'Institucional.Iglesia' THEN '854|Institucional.Iglesia'
            WHEN uso.ilicode = 'Institucional.Iglesia_en_PH' THEN '855|Institucional.Iglesia_en_PH'
            WHEN uso.ilicode = 'Institucional.Instalaciones_Militares' THEN '856|Institucional.Instalaciones_Militares'
            WHEN uso.ilicode = 'Institucional.Jardin_Infantil_en_Casa' THEN '857|Institucional.Jardin_Infantil_en_Casa'
            WHEN uso.ilicode = 'Institucional.Parque_Cementerio' THEN '858|Institucional.Parque_Cementerio'
            WHEN uso.ilicode = 'Institucional.Planetario' THEN '859|Institucional.Planetario'
            WHEN uso.ilicode = 'Institucional.Plaza_de_Toros' THEN '860|Institucional.Plaza_de_Toros'
            WHEN uso.ilicode = 'Institucional.Puestos_de_Salud' THEN '861|Institucional.Puestos_de_Salud'
            WHEN uso.ilicode = 'Institucional.Museos' THEN '862|Institucional.Museos'
            WHEN uso.ilicode = 'Institucional.Seminarios_Conventos' THEN '863|Institucional.Seminarios_Conventos'
            WHEN uso.ilicode = 'Institucional.Teatro' THEN '864|Institucional.Teatro'
            WHEN uso.ilicode = 'Institucional.Unidad_Deportiva' THEN '865|Institucional.Unidad_Deportiva'
            WHEN uso.ilicode = 'Institucional.Velodromo_Patinodromo' THEN '866|Institucional.Velodromo_Patinodromo'

            
            WHEN uso.ilicode = 'Anexo.Albercas_Banaderas' THEN '867|Anexo.Albercas_Banaderas'
            WHEN uso.ilicode = 'Anexo.Beneficiaderos' THEN '868|Anexo.Beneficiaderos'
            WHEN uso.ilicode = 'Anexo.Camaroneras' THEN '869|Anexo.Camaroneras'
            WHEN uso.ilicode = 'Anexo.Canchas' THEN '870|Anexo.Canchas'
            WHEN uso.ilicode = 'Anexo.Canchas_de_Tenis' THEN '871|Anexo.Canchas_de_Tenis'
            WHEN uso.ilicode = 'Anexo.Carretera' THEN '872|Anexo.Carretera'
            WHEN uso.ilicode = 'Anexo.Cerramiento' THEN '873|Anexo.Cerramiento'
            WHEN uso.ilicode = 'Anexo.Cimientos_Estructura_Muros_y_Placa_Base' THEN '874|Anexo.Cimientos_Estructura_Muros_y_Placa_Base'
            WHEN uso.ilicode = 'Anexo.Cocheras_Marraneras_Porquerizas' THEN '875|Anexo.Cocheras_Marraneras_Porquerizas'
            WHEN uso.ilicode = 'Anexo.Construccion_en_Membrana_Arquitectonica' THEN '876|Anexo.Construccion_en_Membrana_Arquitectonica'
            WHEN uso.ilicode = 'Anexo.Contenedor' THEN '877|Anexo.Contenedor'
            WHEN uso.ilicode = 'Anexo.Corrales' THEN '878|Anexo.Corrales'
            WHEN uso.ilicode = 'Anexo.Establos_Pesebreras_Caballerizas' THEN '879|Anexo.Establos_Pesebreras_Caballerizas'
            WHEN uso.ilicode = 'Anexo.Estacion_Bombeo' THEN '880|Anexo.Estacion_Bombeo'
            WHEN uso.ilicode = 'Anexo.Estacion_Sistema_Transporte' THEN '881|Anexo.Estacion_Sistema_Transporte'
            WHEN uso.ilicode = 'Anexo.Galpones_Gallineros' THEN '882|Anexo.Galpones_Gallineros'
            WHEN uso.ilicode = 'Anexo.Glamping' THEN '902|Anexo.Glamping'
            WHEN uso.ilicode = 'Anexo.Hangar' THEN '883|Anexo.Hangar'
            WHEN uso.ilicode = 'Anexo.Kioscos' THEN '884|Anexo.Kioscos'
            WHEN uso.ilicode = 'Anexo.Lagunas_de_Oxidacion' THEN '885|Anexo.Lagunas_de_Oxidacion'
            WHEN uso.ilicode = 'Anexo.Marquesinas_Patios_Cubiertos' THEN '886|Anexo.Marquesinas_Patios_Cubiertos'
            WHEN uso.ilicode = 'Anexo.Muelles' THEN '887|Anexo.Muelles'
            WHEN uso.ilicode = 'Anexo.Murallas' THEN '888|Anexo.Murallas'
            WHEN uso.ilicode = 'Anexo.Pergolas' THEN '889|Anexo.Pergolas'
            WHEN uso.ilicode = 'Anexo.Piscinas' THEN '890|Anexo.Piscinas'
            WHEN uso.ilicode = 'Anexo.Pista_Aeropuerto' THEN '891|Anexo.Pista_Aeropuerto'
            WHEN uso.ilicode = 'Anexo.Pozos' THEN '892|Anexo.Pozos'
            WHEN uso.ilicode = 'Anexo.Ramadas_Cobertizos_Caneyes' THEN '893|Anexo.Ramadas_Cobertizos_Caneyes'
            WHEN uso.ilicode = 'Anexo.Secaderos' THEN '894|Anexo.Secaderos'
            WHEN uso.ilicode = 'Anexo.Silos' THEN '895|Anexo.Silos'
            WHEN uso.ilicode = 'Anexo.Tanques' THEN '896|Anexo.Tanques'
            WHEN uso.ilicode = 'Anexo.Toboganes' THEN '897|Anexo.Toboganes'
            WHEN uso.ilicode = 'Anexo.Torre_de_Control' THEN '898|Anexo.Torre_de_Control'
            WHEN uso.ilicode = 'Anexo.Torres_de_Enfriamiento' THEN '899|Anexo.Torres_de_Enfriamiento'
            WHEN uso.ilicode = 'Anexo.Via_Ferrea' THEN '901|Anexo.Via_Ferrea'

            
            ELSE 'ValorPorDefecto'
        end) AS "IdUso",
        max(CASE
            WHEN noconvencional.cr_carascteristicasunidadconstrccn_cr_clfccncnstrccion is not null THEN 'No Convencional'
            WHEN convencional.cr_carascteristicasunidadconstrccn_cr_clfccncnstrccion is not null then 'Convencional'
            else null
        end) AS "ConvencionalNoConvencional",
        
        max(case 
            when uso.ilicode='Anexo.Torres_de_Enfriamiento' then anexo.ilicode
            else  'TIPO 7' || RIGHT(anexo.ilicode::text, 2) 	
        end) as "calificacionNoConvencional",
        max(COALESCE(
            convencional.total_calificacion,
            CASE
                WHEN uso.ilicode = 'Anexo.Torres_de_Enfriamiento' THEN 0
                WHEN RIGHT(anexo.ilicode::text, 2) ~ '^\d+$' THEN RIGHT(anexo.ilicode::text, 2)::integer
                ELSE 0  
            END
        )) as "Puntos",
        max(caracteristica.area_construida) as "AreaConstruida",
        
        max(construccion.total_pisos) as "NumeroPisos",
        max((2025-caracteristica.anio_construccion)) as "AñoConstruccion",
        max('100') as "PorcentajeConstruido",
        max(caracteristica.total_habitaciones) as "TotalHabitaciones",
        max(caracteristica.total_locales) as "TotalLocales",
        max(caracteristica.total_banios) as "TotalBanos",
        max(null) as "Radicado"


        from "ladm_entrerrios".cr_unidadconstruccion unidad
        left join "ladm_entrerrios".cr_caracteristicasunidadconstruccion caracteristica on unidad.cr_caracteristicasunidadconstruccion = caracteristica.t_id
        left join "ladm_entrerrios".cr_unidadconstrucciontipo constipo on caracteristica.tipo_unidad_construccion =constipo.t_id
        left join "ladm_entrerrios".cr_usouconstipo uso on caracteristica.uso=uso.t_id
        left join "ladm_entrerrios".cr_calificacionconvencional convencional on caracteristica.t_id=convencional.cr_carascteristicasunidadconstrccn_cr_clfccncnstrccion
        left join "ladm_entrerrios".cr_calificacionnoconvencional noconvencional on caracteristica.t_id=noconvencional.cr_carascteristicasunidadconstrccn_cr_clfccncnstrccion 
        left join "ladm_entrerrios".cr_anexotipo anexo on noconvencional.tipo_anexo =anexo.t_id
        left join "ladm_entrerrios".cr_construccion construccion on unidad.cr_construccion =construccion.t_id 
        left join "ladm_entrerrios".col_uebaunit ueba on unidad.t_id=ueba.ue_cr_unidadconstruccion 
        left join "ladm_entrerrios".lc_predio predio on ueba.baunit =predio.t_id 
        group by caracteristica.t_id) AS consulta_base WHERE (
            TRIM(consulta_base."Npn ") LIKE $1 OR
            consulta_base."Npn " LIKE $1
          ) LIMIT $2