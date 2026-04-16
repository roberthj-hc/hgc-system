with source as (select * from HGC_DW.BRONZE_MONGODB.clientes)
select
    id_cliente as id_cliente_nk,
    nombre as nombre_completo,
    celular,
    email,
    cast(fecha_nacimiento as date) as fecha_nacimiento,
    genero,
    segmento,
    cast(fecha_registro as timestamp) as fecha_registro
from source