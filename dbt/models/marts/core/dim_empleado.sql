{{ config(materialized='table') }}
with empleado as (select * from {{ ref('int_empleados_enriquecidos') }})
select
    {{ dbt_utils.generate_surrogate_key(['id_empleado_nk', 'dbt_valid_from']) }} as id_empleado_sk,
    id_empleado_nk,
    nombre_completo,
    documento_identidad,
    fecha_ingreso,
    salario_base,
    tipo_contrato,
    estado_empleado,
    cargo_titulo,
    departamento_nombre,
    dbt_valid_from as valido_desde,
    dbt_valid_to as valido_hasta,
    case when dbt_valid_to is null then true else false end as es_actual
from empleado