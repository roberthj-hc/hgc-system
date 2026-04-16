
-- Extraemos las combinaciones únicas de la tabla transaccional ya que no había catálogo separado
with costo as (
    select distinct categoria_principal, subcategoria 
    from HGC_DW.SILVER.stg_mariadb__costos_operativos
)
select
    md5(cast(coalesce(cast(categoria_principal as TEXT), '_dbt_utils_surrogate_key_null_') || '-' || coalesce(cast(subcategoria as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as id_categoria_costo_sk,
    categoria_principal,
    subcategoria
from costo