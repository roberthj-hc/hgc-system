

select
    nro_delivery_dd,
    nro_pedido_dd,
    
    plataforma_delivery as feature_plataforma_delivery,
    costo_envio as feature_costo_envio,
    
    -- TARGETS:
    tiempo_estimado_minutos as target_tiempo_estimado,
    indicador_delivery_completado as target_delivery_completado

from HGC_DW.features.feat_pedidos_entrega