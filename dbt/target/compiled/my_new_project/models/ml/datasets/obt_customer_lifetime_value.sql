-- =============================================================================
-- obt_customer_lifetime_value.sql
-- OBT (One Big Table) para el modelo de CLV (Customer Lifetime Value)
--
-- Dataset final de entrenamiento + análisis de segmentos.
-- Extiende feat_clientes_comportamiento con:
--   - SEGMENTO del cliente (DIM_CLIENTE via int_clientes_enriquecidos)
--   - CIUDAD y SUCURSAL primaria (int_clv_segmentacion)
--   - NIVEL DE LEALTAD actual (int_clv_segmentacion)
--
-- Columnas:
--   Features: RANGO_EDAD, SEGMENTO, FREQ_TOTAL, CANTIDAD_ARTICULOS,
--             ANTIGUEDAD_DIAS, TICKET_PROMEDIO, CIUDAD, NOMBRE_SUCURSAL,
--             TIPO_FORMATO, NIVEL_LEALTAD_DD, PUNTOS_ACUMULADOS
--   Target:   TARGET_CLV_HISTORICO (valor monetario total del cliente)
-- =============================================================================


with comportamiento as (
    select * from HGC_DW.features.feat_clientes_comportamiento
),

segmentacion as (
    select * from HGC_DW.SILVER.int_clv_segmentacion
),

dim_cliente as (
    -- Traemos SEGMENTO desde DIM_CLIENTE (SCD2 - solo registro actual)
    -- id_cliente_sk es la clave surrogate (numérica) que conecta con int_clv_segmentacion
    select
        id_cliente_nk,
        id_cliente_sk,
        segmento,
        genero
    from HGC_DW.GOLD.dim_cliente
    where es_actual = true
)

select
    -- ── Identificador ─────────────────────────────────────────────────────────
    c.id_cliente_nk,

    -- ── Dimensiones demográficas ──────────────────────────────────────────────
    c.rango_edad,
    dc.segmento,
    dc.genero,

    -- ── Dimensiones geográficas / canal ──────────────────────────────────────
    seg.ciudad,
    seg.nombre_sucursal,
    seg.tipo_formato,

    -- ── Programa de lealtad ───────────────────────────────────────────────────
    seg.nivel_lealtad_dd,
    seg.puntos_acumulados_historicos,

    -- ── Features de comportamiento (para el modelo) ───────────────────────────
    coalesce(c.frecuencia_pedidos, 0)           as feature_freq_total,
    coalesce(c.cantidad_articulos_comprados, 0) as feature_cantidad_articulos,
    coalesce(c.antiguedad_dias, 0)              as feature_antiguedad_dias,
    coalesce(c.ticket_promedio, 0)              as feature_ticket_promedio,
    coalesce(c.recencia_dias, 9999)             as feature_recencia_dias,

    -- ── TARGET Variable (Supervisado - Regresión) ─────────────────────────────
    coalesce(c.valor_monetario_total, 0)        as target_clv_historico

from comportamiento c
left join dim_cliente dc
    on c.id_cliente_nk = dc.id_cliente_nk
left join segmentacion seg
    -- Usamos dc.id_cliente_sk como bridge: dim_cliente conecta nk (string) con sk (numeric)
    on dc.id_cliente_sk = seg.id_cliente_sk