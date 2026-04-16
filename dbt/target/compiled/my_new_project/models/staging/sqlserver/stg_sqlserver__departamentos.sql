with source as (select * from HGC_DW.BRONZE_SQLSERVER.departamentos)
select
    id_departamento as id_departamento_nk,
    nombre as nombre_departamento
from source