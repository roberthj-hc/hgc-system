with source as (select * from HGC_DW.BRONZE_MYSQL.recetas_bom)
select
    id_receta as id_receta_nk,
    id_producto as id_producto_nk,
    id_insumo as id_insumo_nk,
    cast(cantidad_requerida as numeric(10,4)) as cantidad_requerida
from source