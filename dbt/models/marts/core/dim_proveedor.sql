{{ config(materialized='table') }}
with proveedor as (select * from {{ ref('stg_mysql__proveedores') }})
select
    {{ dbt_utils.generate_surrogate_key(['id_proveedor_nk']) }} as id_proveedor_sk,
    id_proveedor_nk,
    nombre_proveedor,
    contacto_principal,
    ciudad_origen,
    estado_proveedor
from proveedor