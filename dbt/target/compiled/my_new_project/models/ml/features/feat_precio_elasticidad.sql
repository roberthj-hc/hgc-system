

/*
    FEATURES: feat_precio_elasticidad
    -----------------------------------
    Calcula features agregados por producto para el análisis de 
    elasticidad y simulación de escenarios de pricing.
    
    Dado que los precios base son fijos, el análisis se centra en:
      - Variación natural de volumen de demanda
      - Revenue y margen por producto
      - Tendencias temporales de volumen
      - Ticket promedio y unidades por transacción
*/

with diario as (
    select * from HGC_DW.SILVER.int_ventas_precios_diarios
),

-- Estadísticas globales por producto
stats_producto as (
    select
        id_producto_nk,
        nombre_producto,
        categoria_nombre,
        tipo_producto,
        precio_base_historico,
        costo_estandar_historico,

        -- Rango temporal
        min(fecha_venta) as primera_venta,
        max(fecha_venta) as ultima_venta,
        count(distinct fecha_venta) as dias_con_ventas,

        -- Estadísticas de volumen (VARÍA diariamente)
        avg(cantidad_vendida_dia) as volumen_promedio_diario,
        stddev(cantidad_vendida_dia) as volumen_desviacion_std,
        sum(cantidad_vendida_dia) as volumen_total_historico,

        -- Estadísticas de transacciones
        avg(num_transacciones_dia) as transacciones_promedio_dia,
        avg(ticket_promedio_dia) as ticket_promedio_historico,
        avg(unidades_por_transaccion_dia) as unidades_por_transaccion_promedio,

        -- Revenue y margen
        sum(revenue_neto_dia) as revenue_neto_total,
        sum(margen_estimado_dia) as margen_total,
        avg(margen_porcentual_dia) as margen_porcentual_promedio,

        -- Revenue por unidad (proxy de precio efectivo)
        avg(revenue_por_unidad_dia) as revenue_por_unidad_promedio,
        stddev(revenue_por_unidad_dia) as revenue_por_unidad_std,

        -- Correlación volumen-revenue (elasticidad empírica)
        corr(cantidad_vendida_dia, revenue_neto_dia) as correlacion_volumen_revenue

    from diario
    group by 1, 2, 3, 4, 5, 6
),

-- Tendencias recientes por producto
tendencias as (
    select
        id_producto_nk,
        
        -- Volumen reciente
        avg(case when fecha_venta >= dateadd(day, -7, current_date()) then cantidad_vendida_dia end) as volumen_promedio_7d,
        avg(case when fecha_venta >= dateadd(day, -30, current_date()) then cantidad_vendida_dia end) as volumen_promedio_30d,
        avg(case when fecha_venta >= dateadd(day, -90, current_date()) then cantidad_vendida_dia end) as volumen_promedio_90d,

        -- Revenue reciente
        sum(case when fecha_venta >= dateadd(day, -30, current_date()) then revenue_neto_dia else 0 end) as revenue_neto_30d,
        sum(case when fecha_venta >= dateadd(day, -90, current_date()) then revenue_neto_dia else 0 end) as revenue_neto_90d,

        -- Margen reciente
        avg(case when fecha_venta >= dateadd(day, -30, current_date()) then margen_porcentual_dia end) as margen_promedio_30d

    from diario
    group by 1
)

select
    sp.id_producto_nk,
    sp.nombre_producto,
    sp.categoria_nombre,
    sp.tipo_producto,
    sp.precio_base_historico,
    sp.costo_estandar_historico,

    -- Features de volumen
    sp.dias_con_ventas,
    round(sp.volumen_promedio_diario, 2) as volumen_promedio_diario,
    round(coalesce(sp.volumen_desviacion_std, 0), 2) as volumen_desviacion_std,
    sp.volumen_total_historico,
    round(sp.transacciones_promedio_dia, 2) as transacciones_promedio_dia,
    round(sp.ticket_promedio_historico, 2) as ticket_promedio_historico,
    round(sp.unidades_por_transaccion_promedio, 2) as unidades_por_transaccion_promedio,

    -- Revenue por unidad (proxy de variación de precio)
    round(sp.revenue_por_unidad_promedio, 2) as revenue_por_unidad_promedio,
    round(coalesce(sp.revenue_por_unidad_std, 0), 4) as revenue_por_unidad_std,

    -- Margen
    round(sp.revenue_neto_total, 2) as revenue_neto_total,
    round(sp.margen_total, 2) as margen_total,
    round(sp.margen_porcentual_promedio, 4) as margen_porcentual_promedio,

    -- Correlación volumen-revenue
    round(coalesce(sp.correlacion_volumen_revenue, 0), 4) as correlacion_volumen_revenue,

    -- Tendencias de volumen
    round(coalesce(t.volumen_promedio_7d, 0), 2) as volumen_promedio_7d,
    round(coalesce(t.volumen_promedio_30d, 0), 2) as volumen_promedio_30d,
    round(coalesce(t.volumen_promedio_90d, 0), 2) as volumen_promedio_90d,
    round(
        case 
            when coalesce(t.volumen_promedio_30d, 0) > 0 
            then (coalesce(t.volumen_promedio_7d, 0) - t.volumen_promedio_30d) / t.volumen_promedio_30d
            else 0 
        end, 4
    ) as tendencia_volumen_7d_vs_30d,

    -- Revenue reciente
    round(coalesce(t.revenue_neto_30d, 0), 2) as revenue_neto_30d,
    round(coalesce(t.revenue_neto_90d, 0), 2) as revenue_neto_90d,
    round(coalesce(t.margen_promedio_30d, 0), 4) as margen_promedio_30d,

    -- Metadata temporal
    sp.primera_venta,
    sp.ultima_venta

from stats_producto sp
left join tendencias t on sp.id_producto_nk = t.id_producto_nk