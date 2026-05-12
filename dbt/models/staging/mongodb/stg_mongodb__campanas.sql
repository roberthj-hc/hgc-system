with source as (select * from {{ source('raw_marketing', 'campanas') }})
select
    id_campana as id_campana_nk,
    nombre as nombre_campana,
    cast(fecha_inicio as date) as fecha_inicio_campana,
    cast(fecha_fin as date) as fecha_fin_campana,
    cast(presupuesto as numeric(10,2)) as presupuesto_campana,
    canal as canal_campana
from source