with source as (select * from {{ source('raw_ventas', 'detalle_pedido') }})
select
    id_detalle as id_detalle_nk,
    id_pedido as id_pedido_nk,
    id_producto as id_producto_nk,
    cast(cantidad as integer) as cantidad,
    cast(precio_unitario as numeric(10,2)) as precio_unitario,
    cast(descuento as numeric(10,2)) as descuento,
    cast(subtotal as numeric(10,2)) as subtotal
from source