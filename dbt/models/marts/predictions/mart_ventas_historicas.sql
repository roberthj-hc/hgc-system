{{ config(materialized='table') }}

select
    cast(to_date(id_fecha_sk::varchar, 'YYYYMMDD') as date) as fecha,
    id_sucursal_sk,
    nombre_sucursal,
    sum(ingreso_bruto) as ventas_reales,
    sum(comisiones_delivery) as comisiones,
    sum(total_mermas) as mermas,
    sum(costo_operativo) as costos
from {{ ref('mart_rentabilidad_diagnostica') }}
group by 1, 2, 3
order by 1, 2
