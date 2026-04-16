
with canal as (select * from HGC_DW.SILVER.stg_postgres__canales_venta)
select
    md5(cast(coalesce(cast(id_canal_nk as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as id_canal_sk,
    id_canal_nk,
    nombre_canal
from canal