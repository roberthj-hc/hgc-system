
  
    

create or replace transient table HGC_DW.GOLD.fact_redencion_cupones
    
    
    
    as (
with redencion as (select * from HGC_DW.SILVER.stg_mongodb__cupones_redimidos),
     pedidos as (select id_pedido_nk, id_sucursal_nk, id_cliente_nk, fecha_hora_transaccion, total_neto from HGC_DW.SILVER.stg_postgres__pedidos)

select
    cast(to_char(p.fecha_hora_transaccion, 'YYYYMMDD') as integer) as id_fecha_redencion_sk,
    ds.id_sucursal_sk,
    dc.id_cliente_sk,
    dcup.id_cupon_sk,

    r.id_redencion_nk as nro_redencion_dd,
    r.id_pedido_nk as nro_pedido_asociado_dd,

    r.monto_descuento_real_otorgado,
    p.total_neto as monto_ticket_asociado,
    1 as indicador_redencion

from redencion r
join pedidos p on r.id_pedido_nk = p.id_pedido_nk
left join HGC_DW.GOLD.dim_sucursal ds on p.id_sucursal_nk = ds.id_sucursal_nk and ds.es_actual = true
left join HGC_DW.GOLD.dim_cliente dc on p.id_cliente_nk = dc.id_cliente_nk and dc.es_actual = true
left join HGC_DW.GOLD.dim_cupon dcup on r.id_cupon_nk = dcup.id_cupon_nk
    )
;


  