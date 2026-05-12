with source as (select * from {{ source('raw_ventas', 'canales_venta') }})
select
    id_canal as id_canal_nk,
    nombre as nombre_canal
from source