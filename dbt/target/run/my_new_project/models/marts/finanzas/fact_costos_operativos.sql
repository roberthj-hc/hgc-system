
  
    

create or replace transient table HGC_DW.GOLD.fact_costos_operativos
    
    
    
    as (
with costos as (select * from HGC_DW.SILVER.stg_mariadb__costos_operativos)

select
    cast(to_char(c.fecha_pago, 'YYYYMMDD') as integer) as id_fecha_pago_sk,
    ds.id_sucursal_sk,
    dcc.id_categoria_costo_sk,

    c.id_costo_nk as nro_costo_dd,
    c.descripcion_gasto as descripcion_gasto_dd,

    c.monto_costo

from costos c
left join HGC_DW.GOLD.dim_sucursal ds on c.id_sucursal_nk = ds.id_sucursal_nk and ds.es_actual = true
left join HGC_DW.GOLD.dim_categoriacosto dcc on c.categoria_principal = dcc.categoria_principal and c.subcategoria = dcc.subcategoria
    )
;


  