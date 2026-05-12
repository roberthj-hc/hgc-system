with source as (select * from {{ source('raw_inventario', 'movimientos_inventario') }})
select
    id_mov as id_movimiento_nk,
    id_insumo as id_insumo_nk,
    id_almacen as id_almacen_nk,
    tipo_mov as tipo_movimiento,
    cast(cantidad as numeric(10,2)) as cantidad_movimiento,
    cast(costo_unitario as numeric(10,2)) as costo_unitario_movimiento,
    motivo,
    id_pedido as id_pedido_nk,
    cast(fecha_hora as timestamp) as fecha_hora_movimiento
from source