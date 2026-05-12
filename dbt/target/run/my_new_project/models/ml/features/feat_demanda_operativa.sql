
  
    

create or replace transient table HGC_DW.features.feat_demanda_operativa
    
    
    
    as (

/*
    FEATURES: feat_demanda_operativa
    -----------------------------------
    Calcula rezagos (lags) y estadísticas móviles para la predicción
    de demanda. Estos indicadores capturan la inercia y volatilidad
    de la demanda reciente.
*/

with base as (
    select * from HGC_DW.SILVER.int_demanda_operativa
),

features as (
    select
        *,
        -- Lags (Inercia)
        lag(cantidad_total_dia, 1) over (partition by id_producto_nk order by fecha_prediccion) as lag_1_dia,
        lag(cantidad_total_dia, 7) over (partition by id_producto_nk order by fecha_prediccion) as lag_7_dias,

        -- Estadísticas Móviles (Tendencia y Volatilidad)
        avg(cantidad_total_dia) over (
            partition by id_producto_nk 
            order by fecha_prediccion 
            rows between 7 preceding and 1 preceding
        ) as rolling_avg_7d,
        
        stddev(cantidad_total_dia) over (
            partition by id_producto_nk 
            order by fecha_prediccion 
            rows between 7 preceding and 1 preceding
        ) as rolling_std_7d,

        avg(cantidad_total_dia) over (
            partition by id_producto_nk 
            order by fecha_prediccion 
            rows between 30 preceding and 1 preceding
        ) as rolling_avg_30d

    from base
)

select
    *,
    -- Coeficiente de variación (indicador de incertidumbre)
    case 
        when rolling_avg_7d > 0 then round(rolling_std_7d / rolling_avg_7d, 4)
        else 0 
    end as feature_coef_variacion_7d
from features
    )
;


  