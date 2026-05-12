with source as (select * from {{ source('raw_finanzas', 'costos_operativos') }})
select
    id_costo as id_costo_nk,
    id_sucursal as id_sucursal_nk,
    categoria as categoria_principal,
    subcategoria,
    cast(monto as numeric(10,2)) as monto_costo,
    cast(fecha_pago as date) as fecha_pago,
    descripcion as descripcion_gasto
from source