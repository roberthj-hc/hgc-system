with source as (select * from HGC_DW.BRONZE_MYSQL.detalle_oc)
select
    id_detalle_oc as id_detalle_oc_nk,
    id_oc as id_oc_nk,
    id_insumo as id_insumo_nk,
    cast(cantidad as numeric(10,2)) as cantidad_comprada,
    cast(precio_unitario as numeric(10,2)) as precio_unitario_compra,
    cast(subtotal as numeric(10,2)) as subtotal_compra
from source