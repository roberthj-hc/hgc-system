with source as (select * from {{ source('raw_marketing', 'cupones') }})
select
    id_cupon as id_cupon_nk,
    id_campana as id_campana_nk,
    codigo as codigo_cupon,
    tipo_descuento,
    cast(valor as numeric(10,2)) as valor_descuento_nominal
from source