with source as (select * from {{ source('raw_rrhh', 'cargos') }})
select
    id_cargo as id_cargo_nk,
    nombre as titulo_cargo,
    id_departamento as id_departamento_nk
from source