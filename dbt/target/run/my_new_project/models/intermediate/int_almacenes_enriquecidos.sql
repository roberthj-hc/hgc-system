
  create or replace   view HGC_DW.SILVER.int_almacenes_enriquecidos
  
  
  
  
  as (
    with almacen as (
    select * from HGC_DW.SILVER.stg_mysql__almacenes
),
sucursal as (
    select * from HGC_DW.SILVER.stg_csv__sucursales
)

select
    a.*,
    s.nombre_sucursal as nombre_sucursal_asociada
from almacen a
left join sucursal s on a.id_sucursal_nk = s.id_sucursal_nk
  );

