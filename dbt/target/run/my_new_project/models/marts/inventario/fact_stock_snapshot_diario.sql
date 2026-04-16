
  
    

create or replace transient table HGC_DW.GOLD.fact_stock_snapshot_diario
    
    
    
    as (
with stock as (select * from HGC_DW.SILVER.stg_mysql__stock)

select
    cast(to_char(s.ultima_actualizacion, 'YYYYMMDD') as integer) as id_fecha_sk,
    da.id_almacen_sk,
    di.id_insumo_sk,

    s.cantidad_actual as cantidad_saldo_final,
    (s.cantidad_actual * di.costo_unitario_historico) as valor_inventario_final,
    s.punto_reorden as cantidad_punto_reorden,
    case when s.cantidad_actual <= s.punto_reorden then 1 else 0 end as indicador_bajo_stock

from stock s
left join HGC_DW.GOLD.dim_almacen da on s.id_almacen_nk = da.id_almacen_nk
left join HGC_DW.GOLD.dim_insumo di on s.id_insumo_nk = di.id_insumo_nk and di.es_actual = true
    )
;


  