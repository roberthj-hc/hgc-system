{{ config(materialized='table') }}

select
    id_cliente_nk,
    rango_edad,
    
    frecuencia_pedidos as feature_freq_total,
    cantidad_articulos_comprados as feature_cantidad_articulos,
    antiguedad_dias as feature_antiguedad_dias,
    
    -- TARGET Variable (Supervisado - Regresión)
    valor_monetario_total as target_clv_historico

from {{ ref('feat_clientes_comportamiento') }}
