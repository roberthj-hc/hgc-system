with source as (select * from {{ source('raw_ventas', 'plataformas_delivery') }})
select
    id_plataforma as id_plataforma_nk,
    nombre as nombre_plataforma
from source