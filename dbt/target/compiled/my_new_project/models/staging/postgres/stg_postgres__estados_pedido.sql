with source as (select * from HGC_DW.BRONZE_POSTGRESQL.estado_pedido)
select
    id_estado as id_estado_nk,
    nombre as nombre_estado
from source