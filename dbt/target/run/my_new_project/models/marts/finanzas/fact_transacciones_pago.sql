
  
    

create or replace transient table HGC_DW.GOLD.fact_transacciones_pago
    
    
    
    as (
with pagos as (select * from HGC_DW.SILVER.stg_mariadb__transacciones_pago),
     pedidos as (select id_pedido_nk, id_sucursal_nk from HGC_DW.SILVER.stg_postgres__pedidos)

select
    cast(to_char(p.fecha_hora_pago, 'YYYYMMDD') as integer) as id_fecha_sk,
    cast(to_char(p.fecha_hora_pago, 'HH24MI') as integer) as id_hora_sk,
    ds.id_sucursal_sk,
    dmp.id_metodo_sk,

    p.id_pago_nk as nro_pago_dd,
    p.id_pedido_nk as nro_pedido_dd,

    p.monto_transaccion

from pagos p
left join pedidos ped on p.id_pedido_nk = ped.id_pedido_nk
left join HGC_DW.GOLD.dim_sucursal ds on ped.id_sucursal_nk = ds.id_sucursal_nk and ds.es_actual = true
left join HGC_DW.GOLD.dim_metodopago dmp on p.id_metodo_nk = dmp.id_metodo_nk
    )
;


  