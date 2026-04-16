{{ config(materialized='table') }}
-- Extraemos las combinaciones únicas de la tabla transaccional ya que no había catálogo separado
with costo as (
    select distinct categoria_principal, subcategoria 
    from {{ ref('stg_mariadb__costos_operativos') }}
)
select
    {{ dbt_utils.generate_surrogate_key(['categoria_principal', 'subcategoria']) }} as id_categoria_costo_sk,
    categoria_principal,
    subcategoria
from costo