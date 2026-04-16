with snap_empleado as (
    select * from HGC_DW.snapshots.snp_empleado
),
cargo as (
    select * from HGC_DW.SILVER.stg_sqlserver__cargos
),
departamento as (
    select * from HGC_DW.SILVER.stg_sqlserver__departamentos
)

select
    e.*,
    c.titulo_cargo as cargo_titulo,
    d.nombre_departamento as departamento_nombre
from snap_empleado e
left join cargo c on e.id_cargo_nk = c.id_cargo_nk
left join departamento d on c.id_departamento_nk = d.id_departamento_nk