

select
    id_cliente_nk,
    
    rango_edad,
    case rango_edad
        when 'Menor de 18' then 1
        when '18 - 25' then 2
        when '26 - 35' then 3
        when 'Mayor de 35' then 4
        else 0
    end as feature_rango_edad_ordinal,

    -- RFM
    frecuencia_pedidos as rfm_frequency,
    valor_monetario_total as rfm_monetary,
    recencia_dias as rfm_recency,
    
    -- Métricas de volumen
    ticket_promedio as feature_ticket_promedio,
    cantidad_articulos_comprados as feature_volumen_articulos

    -- SIN COLUMNA TARGET (MODELO NO SUPERVISADO)

from HGC_DW.features.feat_clientes_comportamiento