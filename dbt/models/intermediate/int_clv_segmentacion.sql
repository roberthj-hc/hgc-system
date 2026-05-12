-- =============================================================================
-- int_clv_segmentacion.sql
-- Capa INTERMEDIATE: Enriquecimiento de clientes con su sucursal primaria
-- y nivel de lealtad vigente, como insumo para el OBT de CLV.
--
-- Lógica:
--   - SUCURSAL PRIMARIA: la sucursal donde el cliente realizó más pedidos.
--   - NIVEL LEALTAD ACTUAL: el nivel registrado en el último cierre mensual.
--
-- Fuentes: fact_ventas_detalle, dim_sucursal, fact_estado_lealtad_mensual
-- =============================================================================
{{ config(materialized='table') }}

with sucursal_por_cliente as (
    -- Contar pedidos por cliente x sucursal para determinar la primaria
    select
        v.id_cliente_sk,
        v.id_sucursal_sk,
        count(distinct v.nro_pedido_dd) as total_pedidos_sucursal,
        row_number() over (
            partition by v.id_cliente_sk
            order by count(distinct v.nro_pedido_dd) desc
        ) as rn
    from {{ ref('fact_ventas_detalle') }} v
    group by
        v.id_cliente_sk,
        v.id_sucursal_sk
),

sucursal_primaria as (
    -- Sucursal donde más compra el cliente
    select
        sp.id_cliente_sk,
        ds.nombre_sucursal,
        ds.ciudad,
        ds.tipo_formato
    from sucursal_por_cliente sp
    join {{ ref('dim_sucursal') }} ds
        on sp.id_sucursal_sk = ds.id_sucursal_sk
        and ds.es_actual = true
    where sp.rn = 1
),

lealtad_por_cliente as (
    -- Nivel de lealtad más reciente por cliente
    select
        id_cliente_sk,
        nivel_lealtad_dd,
        puntos_acumulados_historicos,
        row_number() over (
            partition by id_cliente_sk
            order by id_fecha_cierre_mes_sk desc
        ) as rn
    from {{ ref('fact_estado_lealtad_mensual') }}
),

nivel_lealtad_actual as (
    select
        id_cliente_sk,
        nivel_lealtad_dd,
        puntos_acumulados_historicos
    from lealtad_por_cliente
    where rn = 1
)

select
    sp.id_cliente_sk,
    sp.nombre_sucursal,
    sp.ciudad,
    sp.tipo_formato,
    coalesce(nl.nivel_lealtad_dd, 'Sin Nivel') as nivel_lealtad_dd,
    coalesce(nl.puntos_acumulados_historicos, 0) as puntos_acumulados_historicos

from sucursal_primaria sp
left join nivel_lealtad_actual nl
    on sp.id_cliente_sk = nl.id_cliente_sk
