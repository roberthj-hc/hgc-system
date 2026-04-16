with source as (select * from HGC_DW.BRONZE_MARIADB.transacciones_pago)
select
    id_pago as id_pago_nk,
    id_pedido as id_pedido_nk,
    id_metodo as id_metodo_nk,
    cast(monto as numeric(10,2)) as monto_transaccion,
    estado,
    cast(fecha_pago as timestamp) as fecha_hora_pago
from source