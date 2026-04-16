with source as (select * from {{ source('raw_inventario', 'stock') }})
select
    id_stock as id_stock_nk,
    id_almacen as id_almacen_nk,
    id_insumo as id_insumo_nk,
    cast(cantidad_actual as numeric(10,2)) as cantidad_actual,
    cast(punto_reorden as numeric(10,2)) as punto_reorden,
    cast(stock_minimo as numeric(10,2)) as stock_minimo,
    cast(stock_maximo as numeric(10,2)) as stock_maximo,
    cast(ultima_actualizacion as timestamp) as ultima_actualizacion
from source