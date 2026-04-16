with source as (select * from {{ source('raw_ventas', 'delivery_orden') }})
select
    id_delivery as id_delivery_nk,
    id_pedido as id_pedido_nk,
    id_plataforma as id_plataforma_nk,
    codigo_externo as codigo_externo_plataforma,
    cliente_nombre,
    direccion_entrega,
    telefono,
    estado as estado_delivery,
    cast(costo_envio as numeric(10,2)) as costo_envio,
    cast(tiempo_estimado as integer) as tiempo_estimado_minutos
from source