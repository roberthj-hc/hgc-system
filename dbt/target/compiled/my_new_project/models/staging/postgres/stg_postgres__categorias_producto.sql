with source as (select * from HGC_DW.BRONZE_POSTGRESQL.categoria_producto)
select
    id_categoria as id_categoria_nk,
    nombre as nombre_categoria
from source