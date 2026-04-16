with source as (select * from {{ source('raw_rrhh', 'departamentos') }})
select
    id_departamento as id_departamento_nk,
    nombre as nombre_departamento
from source