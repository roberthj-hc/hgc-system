
  create or replace   view HGC_DW.SILVER.int_demanda_operativa
  
  
  
  
  as (
    /*
    INTERMEDIATE: int_demanda_operativa
    -----------------------------------
    Agrega las ventas a nivel diario por producto para la predicción
    de demanda operativa (preparación en cocina).
    
    Incluye características temporales básicas:
      - día de la semana
      - es fin de semana
      - mes
      - nombre del día
*/

with ventas as (
    select
        to_date(cast(v.id_fecha_sk as varchar), 'YYYYMMDD') as fecha_prediccion,
        v.id_producto_sk,
        v.cantidad_vendida
    from HGC_DW.GOLD.fact_ventas_detalle v
),

producto as (
    select
        id_producto_sk,
        id_producto_nk,
        nombre_producto,
        categoria_nombre,
        tipo_producto,
        es_actual
    from HGC_DW.GOLD.dim_producto
    where es_actual = true
),

-- Agregación diaria por producto
demanda_diaria as (
    select
        v.fecha_prediccion,
        p.id_producto_nk,
        p.nombre_producto,
        p.categoria_nombre,
        p.tipo_producto,
        sum(v.cantidad_vendida) as cantidad_total_dia,
        count(*) as num_ordenes_dia
    from ventas v
    join producto p on v.id_producto_sk = p.id_producto_sk
    group by 1, 2, 3, 4, 5
)

select
    *,
    -- Características temporales
    extract(dayofweek from fecha_prediccion) as dia_semana,
    case 
        when extract(dayofweek from fecha_prediccion) in (6, 0) then 1 
        else 0 
    end as es_fin_de_semana,
    extract(month from fecha_prediccion) as mes,
    dayname(fecha_prediccion) as nombre_dia
from demanda_diaria
  );

