with source as (select * from HGC_DW.BRONZE_CSV_EXCEL.sucursales)
select
    id_sucursal as id_sucursal_nk,
    nombre as nombre_sucursal,
    ciudad,
    direccion,
    tipo_formato,
    cast(fecha_apertura as date) as fecha_apertura,
    estado as estado_sucursal,
    telefono,
    gerente as nombre_gerente,
    cast(created_at as timestamp) as fecha_creacion
from source