
with delivery as (select * from HGC_DW.SILVER.stg_postgres__delivery_orden),
     pedidos as (select id_pedido_nk, id_sucursal_nk, id_cliente_nk, fecha_hora_transaccion from HGC_DW.SILVER.stg_postgres__pedidos)

select
    cast(to_char(p.fecha_hora_transaccion, 'YYYYMMDD') as integer) as id_fecha_sk,
    ds.id_sucursal_sk,
    dpd.id_plataforma_sk,
    dc.id_cliente_sk,

    d.id_delivery_nk as nro_delivery_dd,
    d.id_pedido_nk as nro_pedido_dd,
    d.codigo_externo_plataforma as codigo_externo_plataforma_dd,
    d.estado_delivery as estado_delivery_dd,

    d.costo_envio,
    d.tiempo_estimado_minutos,
    case when lower(d.estado_delivery) = 'entregado' then 1 else 0 end as indicador_delivery_completado

from delivery d
join pedidos p on d.id_pedido_nk = p.id_pedido_nk
left join HGC_DW.GOLD.dim_sucursal ds on p.id_sucursal_nk = ds.id_sucursal_nk and ds.es_actual = true
left join HGC_DW.GOLD.dim_cliente dc on p.id_cliente_nk = dc.id_cliente_nk and dc.es_actual = true
left join HGC_DW.GOLD.dim_plataformadelivery dpd on d.id_plataforma_nk = dpd.id_plataforma_nk