
with producto as (select * from HGC_DW.SILVER.int_productos_enriquecidos)
select
    md5(cast(coalesce(cast(id_producto_nk as TEXT), '_dbt_utils_surrogate_key_null_') || '-' || coalesce(cast(dbt_valid_from as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as id_producto_sk,
    id_producto_nk,
    nombre_producto,
    categoria_nombre,
    tipo_producto,
    precio_base as precio_base_historico,
    costo_estandar as costo_estandar_historico,
    activo,
    dbt_valid_from as valido_desde,
    dbt_valid_to as valido_hasta,
    case when dbt_valid_to is null then true else false end as es_actual
from producto