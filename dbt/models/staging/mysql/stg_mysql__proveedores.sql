with source as (select * from {{ source('raw_inventario', 'proveedores') }})
select
    id_proveedor as id_proveedor_nk,
    nombre as nombre_proveedor,
    contacto as contacto_principal,
    telefono,
    ciudad_origen,
    estado as estado_proveedor
from source