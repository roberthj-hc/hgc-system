

/*
    DATASET: obt_price_elasticity
    --------------------------------
    Dataset diario para análisis de impacto de precios en ventas y ganancias.
    
    Los precios base son fijos en la data actual, por lo que el análisis
    se centra en:
      1. Variación natural del volumen de demanda
      2. Revenue por unidad (varía por mix de transacciones)
      3. Simulación de escenarios de cambio de precio usando elasticidades calibradas
      4. Modelo VAR sobre volumen, revenue y margen (que SÍ varían)
    
    Tipo: Series temporales + Simulación de escenarios
*/

select
    fecha_venta,
    id_producto_nk,
    nombre_producto,
    categoria_nombre,
    tipo_producto,

    -- FEATURES: Precio y costos
    precio_unitario_dia as feature_precio_unitario,
    precio_base_historico as feature_precio_base,
    costo_estandar_historico as feature_costo_estandar,
    revenue_por_unidad_dia as feature_revenue_por_unidad,

    -- FEATURES: Volumen (VARÍA diariamente)
    cantidad_vendida_dia as feature_cantidad_vendida,
    num_transacciones_dia as feature_num_transacciones,
    unidades_por_transaccion_dia as feature_unidades_por_transaccion,

    -- FEATURES: Revenue (VARÍA diariamente)
    revenue_bruto_dia as feature_revenue_bruto,
    revenue_neto_dia as feature_revenue_neto,
    ticket_promedio_dia as feature_ticket_promedio,

    -- FEATURES: Margen (VARÍA diariamente)
    margen_estimado_dia as feature_margen_estimado,
    margen_porcentual_dia as feature_margen_porcentual

from HGC_DW.SILVER.int_ventas_precios_diarios