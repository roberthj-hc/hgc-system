with source as (select * from {{ source('raw_ventas', 'categoria_producto') }})
select
    id_categoria as id_categoria_nk,
    nombre as nombre_categoria
from source