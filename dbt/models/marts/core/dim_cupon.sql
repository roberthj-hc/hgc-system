{{ config(materialized='table') }}
with cupones as (select * from {{ ref('stg_mongodb__cupones') }}),
     campanas as (select * from {{ ref('stg_mongodb__campanas') }})
select
    {{ dbt_utils.generate_surrogate_key(['c.id_cupon_nk']) }} as id_cupon_sk,
    c.id_cupon_nk,
    c.codigo_cupon,
    c.tipo_descuento,
    c.valor_descuento_nominal,
    ca.nombre_campana,
    ca.canal_campana
from cupones c
left join campanas ca on c.id_campana_nk = ca.id_campana_nk