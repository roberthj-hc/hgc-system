
with almacen as (select * from HGC_DW.SILVER.int_almacenes_enriquecidos)
select
    md5(cast(coalesce(cast(id_almacen_nk as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as id_almacen_sk,
    id_almacen_nk,
    nombre_almacen,
    tipo_almacen,
    nombre_sucursal_asociada
from almacen