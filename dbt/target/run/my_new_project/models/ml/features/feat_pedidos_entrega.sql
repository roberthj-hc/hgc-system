
  
    

create or replace transient table HGC_DW.features.feat_pedidos_entrega
    
    
    
    as (

with fact_delivery as (
    -- Tomamos la granularidad más baja directo de la fact table Gold
    select * from HGC_DW.GOLD.fact_delivery
),
dim_plataforma as (
    -- Join simple para obtener el nombre de la plataforma (Feature categórico)
    select id_plataforma_sk, id_plataforma_nk, nombre_plataforma
    from HGC_DW.GOLD.dim_plataformadelivery
)

select
    f.nro_delivery_dd,
    f.nro_pedido_dd,
    
    p.nombre_plataforma as plataforma_delivery,
    
    coalesce(f.costo_envio, 0) as costo_envio,
    
    f.tiempo_estimado_minutos,
    f.indicador_delivery_completado

from fact_delivery f
left join dim_plataforma p on f.id_plataforma_sk = p.id_plataforma_sk
    )
;


  