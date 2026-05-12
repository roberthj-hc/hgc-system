
  
    

create or replace transient table HGC_DW.GOLD.fact_facturacion
    
    
    
    as (
with facturas as (select * from HGC_DW.SILVER.stg_mariadb__facturas),
     pedidos as (select id_pedido_nk, id_sucursal_nk, impuesto from HGC_DW.SILVER.stg_postgres__pedidos)

select
    cast(to_char(f.fecha_emision, 'YYYYMMDD') as integer) as id_fecha_emision_sk,
    ds.id_sucursal_sk,

    f.id_factura_nk as nro_factura_dd,
    f.id_pedido_nk as nro_pedido_dd,
    f.nit_cliente as nit_cliente_dd,
    f.razon_social as razon_social_dd,
    f.nro_autorizacion as nro_autorizacion_fiscal_dd,
    f.codigo_control as codigo_control_dd,

    f.monto_total_facturado,
    ped.impuesto as monto_impuesto_fiscal

from facturas f
join pedidos ped on f.id_pedido_nk = ped.id_pedido_nk
left join HGC_DW.GOLD.dim_sucursal ds on ped.id_sucursal_nk = ds.id_sucursal_nk and ds.es_actual = true
    )
;


  