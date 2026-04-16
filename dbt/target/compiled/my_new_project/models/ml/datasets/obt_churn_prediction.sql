

select
    id_cliente_nk,
    rango_edad,
    
    -- Features predictivos base
    frecuencia_pedidos as feature_frecuencia_historica,
    valor_monetario_total as feature_monto_gasto_historico,
    recencia_dias as feature_recencia_dias,

    -- PROCESO SUPERVISADO (TARGET)
    case 
        when recencia_dias >= 90 then 1 
        else 0 
    end as target_es_churn

from HGC_DW.features.feat_clientes_comportamiento