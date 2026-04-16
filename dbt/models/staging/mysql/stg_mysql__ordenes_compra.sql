with source as (select * from {{ source('raw_inventario', 'ordenes_compra') }})
select
    id_oc as id_oc_nk,
    id_proveedor as id_proveedor_nk,
    id_sucursal as id_sucursal_nk,
    cast(fecha_pedido as date) as fecha_pedido,
    cast(fecha_recepcion as date) as fecha_recepcion_esperada,
    estado as estado_oc,
    cast(total as numeric(10,2)) as monto_total
from source