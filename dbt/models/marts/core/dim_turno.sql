{{ config(materialized='table') }}
with turno as (select * from {{ ref('stg_sqlserver__turnos') }})
select
    {{ dbt_utils.generate_surrogate_key(['id_turno_nk']) }} as id_turno_sk,
    id_turno_nk,
    nombre_turno,
    hora_inicio_estandar,
    hora_fin_estandar,
    tipo_turno
from turno