
  
    

create or replace transient table HGC_DW.GOLD.fact_estado_lealtad_mensual
    
    
    
    as (
with lealtad as (select * from HGC_DW.SILVER.stg_mongodb__programa_lealtad)

select
    cast(to_char(l.fecha_actualizacion, 'YYYYMMDD') as integer) as id_fecha_cierre_mes_sk,
    coalesce(dc_hist.id_cliente_sk, dc_curr.id_cliente_sk) as id_cliente_sk,

    l.nivel_lealtad as nivel_lealtad_dd,

    l.puntos_acumulados as puntos_disponibles_cierre,
    l.puntos_acumulados as puntos_acumulados_historicos, -- Requiere lógica histórica avanzada
    0 as variacion_puntos_mes -- Placeholder para lógica de LAG()

from lealtad l
left join HGC_DW.GOLD.dim_cliente dc_hist on l.id_cliente_nk = dc_hist.id_cliente_nk 
    and l.fecha_actualizacion >= dc_hist.valido_desde and (l.fecha_actualizacion < dc_hist.valido_hasta or dc_hist.valido_hasta is null)
left join HGC_DW.GOLD.dim_cliente dc_curr on l.id_cliente_nk = dc_curr.id_cliente_nk and dc_curr.es_actual = true
    )
;


  