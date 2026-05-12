with source as (select * from {{ source('raw_inventario', 'almacenes') }})
select
    id_almacen as id_almacen_nk,
    id_sucursal as id_sucursal_nk,
    nombre as nombre_almacen,
    tipo as tipo_almacen
from source