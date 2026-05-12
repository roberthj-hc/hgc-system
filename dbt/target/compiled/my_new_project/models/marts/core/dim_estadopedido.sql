
with estado as (select * from HGC_DW.SILVER.stg_postgres__estados_pedido)
select
    md5(cast(coalesce(cast(id_estado_nk as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as id_estado_sk,
    id_estado_nk,
    nombre_estado
from estado