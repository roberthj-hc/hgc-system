
with cupones as (select * from HGC_DW.SILVER.stg_mongodb__cupones),
     campanas as (select * from HGC_DW.SILVER.stg_mongodb__campanas)
select
    md5(cast(coalesce(cast(c.id_cupon_nk as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as id_cupon_sk,
    c.id_cupon_nk,
    c.codigo_cupon,
    c.tipo_descuento,
    c.valor_descuento_nominal,
    ca.nombre_campana,
    ca.canal_campana
from cupones c
left join campanas ca on c.id_campana_nk = ca.id_campana_nk