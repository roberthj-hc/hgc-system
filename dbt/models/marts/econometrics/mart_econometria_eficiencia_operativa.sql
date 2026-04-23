{{ config(materialized='table') }}

with costos_insumos as (
    select
        da.nombre_sucursal_asociada as nombre_sucursal,
        left(m.id_fecha_sk::varchar, 6) as mes_id,
        sum(m.monto_total_movimiento) as costo_total_insumos
    from {{ ref('fact_movimientos_inventario') }} m
    join {{ ref('dim_almacen') }} da on m.id_almacen_sk = da.id_almacen_sk
    where m.monto_total_movimiento > 0
    group by 1, 2
),

ventas_sucursal as (
    select
        nombre_sucursal,
        to_char(fecha, 'YYYYMM') as mes_id,
        sum(ventas_reales) as venta_total,
        -- Usamos el conteo de transacciones/registros como proxy de volumen operativo
        count(*) as volumen_operativo
    from {{ ref('mart_ventas_historicas') }}
    group by 1, 2
),

info_sucursal as (
    select distinct
        nombre_sucursal,
        tipo_formato
    from {{ ref('dim_sucursal') }}
)

select
    v.nombre_sucursal,
    v.mes_id,
    i.tipo_formato,
    v.venta_total,
    v.volumen_operativo,
    c.costo_total_insumos,
    -- Variables Logaritmicas para Cobb-Douglas
    ln(nullif(v.venta_total, 0)) as log_y,
    ln(nullif(c.costo_total_insumos, 0)) as log_x_costo,
    ln(nullif(v.volumen_operativo, 0)) as log_x_volumen
from ventas_sucursal v
join costos_insumos c on v.nombre_sucursal = c.nombre_sucursal and v.mes_id = c.mes_id
join info_sucursal i on v.nombre_sucursal = i.nombre_sucursal
