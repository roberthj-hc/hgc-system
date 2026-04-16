
  
    

create or replace transient table HGC_DW.training_datasets.obt_inventory_optimization
    
    
    
    as (

/*
    DATASET: obt_inventory_optimization
    -------------------------------------
    Dataset final para el modelo Newsvendor de optimización de inventario.
    
    Objetivo: Determinar la cantidad óptima de compra (Q*) para cada insumo
    minimizando el riesgo de quiebre de stock y el desperdicio.
    
    Modelo: Newsvendor → Q* = μ_LT + z(SL) × σ_LT
    donde:
      μ_LT = demanda esperada durante el lead time
      σ_LT = desviación de la demanda durante el lead time
      z(SL) = valor z de la distribución normal para el nivel de servicio deseado
    
    Tipo: Optimización bajo incertidumbre (NO supervisado ni clásico)
*/

select
    id_insumo_nk,
    id_almacen_nk,
    nombre_insumo,
    unidad_medida,

    -- FEATURES: Estadísticas de demanda
    demanda_promedio_diaria as feature_demanda_promedio_diaria,
    demanda_desviacion_std as feature_demanda_desviacion_std,
    coeficiente_variacion as feature_coeficiente_variacion,
    demanda_mediana_diaria as feature_demanda_mediana_diaria,
    demanda_minima_diaria as feature_demanda_minima_diaria,
    demanda_maxima_diaria as feature_demanda_maxima_diaria,

    -- FEATURES: Tendencia
    demanda_promedio_7d as feature_demanda_promedio_7d,
    demanda_promedio_30d as feature_demanda_promedio_30d,
    tendencia_demanda_ratio as feature_tendencia_demanda_ratio,
    dias_activos_ultimo_mes as feature_dias_activos_ultimo_mes,

    -- FEATURES: Stock
    stock_actual as feature_stock_actual,
    punto_reorden as feature_punto_reorden,
    stock_minimo as feature_stock_minimo,
    stock_maximo as feature_stock_maximo,
    indicador_bajo_stock as feature_indicador_bajo_stock,
    dias_cobertura_stock as feature_dias_cobertura_stock,

    -- FEATURES: Costos y Lead Time
    costo_unitario as feature_costo_unitario,
    precio_compra_promedio as feature_precio_compra_promedio,
    lead_time_promedio_dias as feature_lead_time_dias,

    -- FEATURES: Demanda durante Lead Time (inputs directos del Newsvendor)
    demanda_esperada_lead_time as feature_demanda_esperada_lt,
    desviacion_demanda_lead_time as feature_desviacion_demanda_lt,

    -- FEATURES: Criticidad
    num_productos_dependientes as feature_num_productos_dependientes,

    -- METADATA: Contexto temporal
    dias_con_demanda as meta_dias_con_demanda,
    primera_fecha_consumo as meta_primera_fecha,
    ultima_fecha_consumo as meta_ultima_fecha,
    rango_dias_historico as meta_rango_dias

from HGC_DW.features.feat_inventario_demanda
-- Solo insumos con suficiente historial para hacer predicciones confiables
where dias_con_demanda >= 5
    )
;


  