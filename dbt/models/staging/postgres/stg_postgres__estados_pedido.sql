with source as (select * from {{ source('raw_ventas', 'estado_pedido') }})
select
    id_estado as id_estado_nk,
    nombre as nombre_estado
from source