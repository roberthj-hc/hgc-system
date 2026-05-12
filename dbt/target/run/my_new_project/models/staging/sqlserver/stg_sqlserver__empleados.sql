
  create or replace   view HGC_DW.SILVER.stg_sqlserver__empleados
  
  
  
  
  as (
    with source as (select * from HGC_DW.BRONZE_SQLSERVER.empleados)
select
    id_empleado as id_empleado_nk,
    id_cargo as id_cargo_nk,
    id_sucursal as id_sucursal_nk,
    nombre as nombre_completo,
    documento_identidad,
    telefono,
    cast(fecha_ingreso as date) as fecha_ingreso,
    cast(salario_base as numeric(10,2)) as salario_base,
    tipo_contrato,
    estado as estado_empleado
from source
  );

