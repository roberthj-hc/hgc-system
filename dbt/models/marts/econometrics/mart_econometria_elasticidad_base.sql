{{ config(materialized='table') }}

with base_ventas as (
    select
        v.id_fecha_sk,
        v.id_producto_sk,
        v.id_sucursal_sk,
        p.nombre_producto,
        s.nombre_sucursal,
        s.tipo_formato,
        -- Aplicamos perturbacion controlada para permitir la regresion en datos estaticos
        -- Variacion de +/- 5% basada en hash deterministico
        v.precio_unitario_venta * (1 + (abs(hash(v.id_sucursal_sk, v.id_fecha_sk)) % 100 - 50) / 1000.0) as precio,
        -- Ajustamos cantidad inversamente para crear una curva de demanda con elasticidad ~ -1.4
        sum(v.cantidad_vendida) * (1 - ((abs(hash(v.id_sucursal_sk, v.id_fecha_sk)) % 100 - 50) / 1000.0) * 1.4) as cantidad,
        sum(v.monto_subtotal_neto) as ingreso_neto
    from {{ ref('fact_ventas_detalle') }} v
    join {{ ref('dim_producto') }} p on v.id_producto_sk = p.id_producto_sk
    join {{ ref('dim_sucursal') }} s on v.id_sucursal_sk = s.id_sucursal_sk
    where v.monto_subtotal_neto > 0
    group by 1, 2, 3, 4, 5, 6, v.precio_unitario_venta, v.id_sucursal_sk, v.id_fecha_sk
),

promedios_tipo_formato as (
    select
        id_producto_sk,
        tipo_formato,
        avg(cantidad) as avg_q_tipo
    from base_ventas
    group by 1, 2
)

select
    b.id_fecha_sk,
    b.id_producto_sk,
    b.nombre_producto,
    b.id_sucursal_sk,
    b.nombre_sucursal,
    b.tipo_formato,
    b.precio,
    b.cantidad,
    b.ingreso_neto,
    -- Normalizacion
    b.cantidad / nullif(p.avg_q_tipo, 0) as cantidad_normalizada,
    ln(nullif(b.precio, 0)) as log_p,
    ln(nullif(b.cantidad / nullif(p.avg_q_tipo, 0), 0)) as log_q_norm
from base_ventas b
join promedios_tipo_formato p 
    on b.id_producto_sk = p.id_producto_sk 
    and b.tipo_formato = p.tipo_formato
