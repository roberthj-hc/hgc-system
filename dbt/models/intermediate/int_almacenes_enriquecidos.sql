with almacen as (
    select * from {{ ref('stg_mysql__almacenes') }}
),
sucursal as (
    select * from {{ ref('stg_csv__sucursales') }}
)

select
    a.*,
    s.nombre_sucursal as nombre_sucursal_asociada
from almacen a
left join sucursal s on a.id_sucursal_nk = s.id_sucursal_nk