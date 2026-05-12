
with proveedor as (select * from HGC_DW.SILVER.stg_mysql__proveedores)
select
    md5(cast(coalesce(cast(id_proveedor_nk as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as id_proveedor_sk,
    id_proveedor_nk,
    nombre_proveedor,
    contacto_principal,
    ciudad_origen,
    estado_proveedor
from proveedor