
with eval as (select * from HGC_DW.SILVER.stg_sqlserver__evaluacion_desempeno)

select
    cast(to_char(e.fecha_evaluacion, 'YYYYMMDD') as integer) as id_fecha_evaluacion_sk,
    de.id_empleado_sk,

    e.id_evaluacion_nk as nro_evaluacion_dd,
    coalesce(e.comentarios_evaluador, 'Sin comentarios') as comentarios_evaluador_dd,

    e.puntaje_obtenido,
    case when e.puntaje_obtenido >= 70 then 1 else 0 end as indicador_aprobacion

from eval e
left join HGC_DW.GOLD.dim_empleado de on e.id_empleado_nk = de.id_empleado_nk and de.es_actual = true