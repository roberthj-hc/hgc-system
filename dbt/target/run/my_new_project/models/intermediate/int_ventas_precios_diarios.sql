
  create or replace   view HGC_DW.SILVER.int_ventas_precios_diarios
  
  
  
  
  as (
    /*
    INTERMEDIATE: int_ventas_precios_diarios
    ------------------------------------------
    Agrega ventas a nivel diario por producto, calculando el precio
    efectivo por unidad (revenue/cantidad) que SÍ varía por transacción.
    
    NOTA: Los precios base son fijos en esta data, pero el precio
    efectivo por unidad varía porque cada transacción tiene diferentes
    cantidades y subtotales. El análisis se basa en volumen de demanda
    y su relación con revenue/margen para simular escenarios de pricing.
    
    Fuentes (Silver / Gold):
      - fact_ventas_detalle (ventas con precios efectivos)
      - dim_producto (precio base, costo estándar, categoría)
*/

with ventas as (
    select
        to_date(cast(v.id_fecha_sk as varchar), 'YYYYMMDD') as fecha_venta,
        v.id_producto_sk,
        v.cantidad_vendida,
        v.precio_unitario_venta,
        v.monto_subtotal_bruto,
        v.monto_descuento_linea,
        v.monto_subtotal_neto
    from HGC_DW.GOLD.fact_ventas_detalle v
),

producto as (
    select
        id_producto_sk,
        id_producto_nk,
        nombre_producto,
        categoria_nombre,
        tipo_producto,
        precio_base_historico,
        costo_estandar_historico,
        es_actual
    from HGC_DW.GOLD.dim_producto
    where es_actual = true
),

-- Agregación diaria por producto
ventas_diarias as (
    select
        v.fecha_venta,
        p.id_producto_nk,
        p.nombre_producto,
        p.categoria_nombre,
        p.tipo_producto,
        p.precio_base_historico,
        p.costo_estandar_historico,

        -- Métricas de volumen
        sum(v.cantidad_vendida) as cantidad_vendida_dia,
        count(*) as num_transacciones_dia,

        -- Métricas de precio
        p.precio_base_historico as precio_unitario_dia,

        -- Métricas de revenue
        sum(v.monto_subtotal_bruto) as revenue_bruto_dia,
        sum(v.monto_descuento_linea) as descuento_total_dia,
        sum(v.monto_subtotal_neto) as revenue_neto_dia,

        -- Revenue por unidad efectivo (VARÍA por día según mix de cantidades)
        case
            when sum(v.cantidad_vendida) > 0
            then round(sum(v.monto_subtotal_neto) / sum(v.cantidad_vendida), 2)
            else 0
        end as revenue_por_unidad_dia,

        -- Margen estimado
        sum(v.monto_subtotal_neto) - (sum(v.cantidad_vendida) * p.costo_estandar_historico) as margen_estimado_dia

    from ventas v
    join producto p on v.id_producto_sk = p.id_producto_sk
    group by 1, 2, 3, 4, 5, 6, 7
)

select
    *,
    -- Margen porcentual
    case 
        when revenue_neto_dia > 0 
        then round(margen_estimado_dia / revenue_neto_dia, 4)
        else 0 
    end as margen_porcentual_dia,

    -- Ticket promedio por transacción
    case
        when num_transacciones_dia > 0
        then round(revenue_neto_dia / num_transacciones_dia, 2)
        else 0
    end as ticket_promedio_dia,

    -- Unidades promedio por transacción
    case
        when num_transacciones_dia > 0
        then round(cantidad_vendida_dia * 1.0 / num_transacciones_dia, 2)
        else 0
    end as unidades_por_transaccion_dia

from ventas_diarias
  );

