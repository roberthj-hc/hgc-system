{{ config(materialized='table') }}
with movs as (select * from {{ ref('stg_mysql__movimientos_inventario') }})

select
    cast(to_char(m.fecha_hora_movimiento, 'YYYYMMDD') as integer) as id_fecha_sk,
    cast(to_char(m.fecha_hora_movimiento, 'HH24MI') as integer) as id_hora_sk,
    da.id_almacen_sk,
    coalesce(di_hist.id_insumo_sk, di_curr.id_insumo_sk) as id_insumo_sk,
    dtm.id_tipo_mov_sk,

    m.id_movimiento_nk as nro_movimiento_dd,
    m.id_pedido_nk as nro_pedido_asociado_dd,
    m.motivo as motivo_dd,

    m.cantidad_movimiento,
    m.costo_unitario_movimiento,
    (m.cantidad_movimiento * m.costo_unitario_movimiento) as monto_total_movimiento

from movs m
left join {{ ref('dim_almacen') }} da on m.id_almacen_nk = da.id_almacen_nk

-- SCD2 fallback logic for insumo
left join {{ ref('dim_insumo') }} di_hist on m.id_insumo_nk = di_hist.id_insumo_nk 
    and m.fecha_hora_movimiento >= di_hist.valido_desde and (m.fecha_hora_movimiento < di_hist.valido_hasta or di_hist.valido_hasta is null)
left join {{ ref('dim_insumo') }} di_curr on m.id_insumo_nk = di_curr.id_insumo_nk and di_curr.es_actual = true

left join {{ ref('dim_tipomovimiento') }} dtm on m.tipo_movimiento = dtm.descripcion_movimiento