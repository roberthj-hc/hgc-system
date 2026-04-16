with source as (select * from {{ source('raw_finanzas', 'metodos_pago') }})
select
    id_metodo as id_metodo_nk,
    nombre as nombre_metodo
from source