{{ config(materialized='table') }}

/*
    FEATURES: feat_inventario_demanda
    ----------------------------------
    Calcula features estadísticos de demanda por insumo/almacén 
    para alimentar el modelo Newsvendor de optimización de inventario.
    
    Features calculados:
      - Demanda: promedio, desviación estándar, coeficiente de variación
      - Tendencia: comparación últimos 7 vs 30 días
      - Stock: niveles actuales, punto de reorden, cobertura en días
      - Compras: lead time, costo unitario
      - Criticidad: número de productos que dependen del insumo
*/

with demanda_diaria as (
    select * from {{ ref('int_demanda_insumos') }}
),

-- Estadísticas globales de demanda por insumo-almacén
stats_demanda as (
    select
        id_insumo_nk,
        id_almacen_nk,

        -- Estadísticas de demanda global
        count(distinct fecha_consumo) as dias_con_demanda,
        sum(cantidad_consumida_dia) as demanda_total_historica,
        avg(cantidad_consumida_dia) as demanda_promedio_diaria,
        stddev(cantidad_consumida_dia) as demanda_desviacion_std,
        min(cantidad_consumida_dia) as demanda_minima_diaria,
        max(cantidad_consumida_dia) as demanda_maxima_diaria,
        median(cantidad_consumida_dia) as demanda_mediana_diaria,

        -- Rango temporal
        min(fecha_consumo) as primera_fecha_consumo,
        max(fecha_consumo) as ultima_fecha_consumo,
        datediff(day, min(fecha_consumo), max(fecha_consumo)) as rango_dias_historico

    from demanda_diaria
    group by 1, 2
),

-- Tendencia reciente: últimos 7 días vs últimos 30 días
tendencia_reciente as (
    select
        id_insumo_nk,
        id_almacen_nk,

        avg(case when fecha_consumo >= dateadd(day, -7, current_date()) then cantidad_consumida_dia end) as demanda_promedio_7d,
        avg(case when fecha_consumo >= dateadd(day, -30, current_date()) then cantidad_consumida_dia end) as demanda_promedio_30d,
        
        count(case when fecha_consumo >= dateadd(day, -30, current_date()) then 1 end) as dias_activos_ultimo_mes

    from demanda_diaria
    group by 1, 2
),

-- Último registro de stock e info del insumo (tomar el registro más reciente)
info_insumo as (
    select distinct
        id_insumo_nk,
        id_almacen_nk,
        last_value(nombre_insumo) over (partition by id_insumo_nk, id_almacen_nk order by fecha_consumo
            rows between unbounded preceding and unbounded following) as nombre_insumo,
        last_value(unidad_medida) over (partition by id_insumo_nk, id_almacen_nk order by fecha_consumo
            rows between unbounded preceding and unbounded following) as unidad_medida,
        last_value(costo_unitario) over (partition by id_insumo_nk, id_almacen_nk order by fecha_consumo
            rows between unbounded preceding and unbounded following) as costo_unitario,
        last_value(stock_actual) over (partition by id_insumo_nk, id_almacen_nk order by fecha_consumo
            rows between unbounded preceding and unbounded following) as stock_actual,
        last_value(punto_reorden) over (partition by id_insumo_nk, id_almacen_nk order by fecha_consumo
            rows between unbounded preceding and unbounded following) as punto_reorden,
        last_value(stock_minimo) over (partition by id_insumo_nk, id_almacen_nk order by fecha_consumo
            rows between unbounded preceding and unbounded following) as stock_minimo,
        last_value(stock_maximo) over (partition by id_insumo_nk, id_almacen_nk order by fecha_consumo
            rows between unbounded preceding and unbounded following) as stock_maximo,
        last_value(lead_time_promedio_dias) over (partition by id_insumo_nk, id_almacen_nk order by fecha_consumo
            rows between unbounded preceding and unbounded following) as lead_time_promedio_dias,
        last_value(precio_compra_promedio) over (partition by id_insumo_nk, id_almacen_nk order by fecha_consumo
            rows between unbounded preceding and unbounded following) as precio_compra_promedio,
        last_value(num_productos_dependientes) over (partition by id_insumo_nk, id_almacen_nk order by fecha_consumo
            rows between unbounded preceding and unbounded following) as num_productos_dependientes
    from demanda_diaria
)

select
    sd.id_insumo_nk,
    sd.id_almacen_nk,
    ii.nombre_insumo,
    ii.unidad_medida,

    -- Features de demanda estadística
    sd.dias_con_demanda,
    sd.demanda_total_historica,
    round(sd.demanda_promedio_diaria, 4) as demanda_promedio_diaria,
    round(coalesce(sd.demanda_desviacion_std, 0), 4) as demanda_desviacion_std,
    sd.demanda_minima_diaria,
    sd.demanda_maxima_diaria,
    round(sd.demanda_mediana_diaria, 4) as demanda_mediana_diaria,

    -- Coeficiente de variación (volatilidad de la demanda)
    round(
        case 
            when sd.demanda_promedio_diaria > 0 
            then coalesce(sd.demanda_desviacion_std, 0) / sd.demanda_promedio_diaria 
            else 0 
        end, 4
    ) as coeficiente_variacion,

    -- Features de tendencia
    round(coalesce(tr.demanda_promedio_7d, 0), 4) as demanda_promedio_7d,
    round(coalesce(tr.demanda_promedio_30d, 0), 4) as demanda_promedio_30d,
    round(
        case 
            when coalesce(tr.demanda_promedio_30d, 0) > 0 
            then (coalesce(tr.demanda_promedio_7d, 0) - tr.demanda_promedio_30d) / tr.demanda_promedio_30d
            else 0 
        end, 4
    ) as tendencia_demanda_ratio,
    coalesce(tr.dias_activos_ultimo_mes, 0) as dias_activos_ultimo_mes,

    -- Features de stock
    ii.stock_actual,
    ii.punto_reorden,
    ii.stock_minimo,
    ii.stock_maximo,
    case when ii.stock_actual <= ii.punto_reorden then 1 else 0 end as indicador_bajo_stock,

    -- Cobertura de stock en días
    round(
        case 
            when sd.demanda_promedio_diaria > 0 
            then ii.stock_actual / sd.demanda_promedio_diaria 
            else 9999 
        end, 2
    ) as dias_cobertura_stock,

    -- Features de compras y costos
    ii.costo_unitario,
    ii.precio_compra_promedio,
    ii.lead_time_promedio_dias,

    -- Demanda durante lead time (para modelo Newsvendor)
    round(sd.demanda_promedio_diaria * coalesce(nullif(ii.lead_time_promedio_dias, 0), 1), 4) as demanda_esperada_lead_time,
    round(coalesce(sd.demanda_desviacion_std, 0) * sqrt(coalesce(nullif(ii.lead_time_promedio_dias, 0), 1)), 4) as desviacion_demanda_lead_time,

    -- Criticidad del insumo
    ii.num_productos_dependientes,

    -- Rango histórico
    sd.primera_fecha_consumo,
    sd.ultima_fecha_consumo,
    sd.rango_dias_historico

from stats_demanda sd
left join tendencia_reciente tr on sd.id_insumo_nk = tr.id_insumo_nk and sd.id_almacen_nk = tr.id_almacen_nk
left join info_insumo ii on sd.id_insumo_nk = ii.id_insumo_nk and sd.id_almacen_nk = ii.id_almacen_nk
