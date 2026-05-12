with source as (select * from HGC_DW.BRONZE_POSTGRESQL.pedidos)
select
    id_pedido as id_pedido_nk,
    id_sucursal as id_sucursal_nk,
    id_cliente as id_cliente_nk,
    id_empleado_cajero as id_empleado_nk,
    id_canal as id_canal_nk,
    id_estado as id_estado_nk,
    id_fecha as id_fecha_nk,
    cast(fecha_hora as timestamp) as fecha_hora_transaccion,
    coalesce(cast(observaciones as varchar), 'Sin observaciones') as observaciones_pedido,
    cast(total_bruto as numeric(10,2)) as total_bruto,
    cast(total_descuento as numeric(10,2)) as total_descuento,
    cast(total_neto as numeric(10,2)) as total_neto,
    cast(impuesto as numeric(10,2)) as impuesto,
    cast(propina as numeric(10,2)) as propina,
    cast(created_at as timestamp) as fecha_creacion
from source