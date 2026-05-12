with source as (select * from HGC_DW.BRONZE_MONGODB.programa_lealtad)
select
    id_lealtad as id_lealtad_nk,
    id_cliente as id_cliente_nk,
    cast(puntos_acumulados as integer) as puntos_acumulados,
    nivel as nivel_lealtad,
    cast(fecha_actualizacion as timestamp) as fecha_actualizacion
from source