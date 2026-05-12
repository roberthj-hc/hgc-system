
with plataforma as (select * from HGC_DW.SILVER.stg_postgres__plataformas_delivery)
select
    md5(cast(coalesce(cast(id_plataforma_nk as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as id_plataforma_sk,
    id_plataforma_nk,
    nombre_plataforma
from plataforma