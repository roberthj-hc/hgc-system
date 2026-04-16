with source as (select * from HGC_DW.BRONZE_POSTGRESQL.plataformas_delivery)
select
    id_plataforma as id_plataforma_nk,
    nombre as nombre_plataforma
from source