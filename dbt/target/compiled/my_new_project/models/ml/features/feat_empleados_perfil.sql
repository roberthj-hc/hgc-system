

with empleados as (
    -- Entidad con todos sus features enriquecidos crudos
    select * from HGC_DW.SILVER.int_empleados_enriquecidos
),
dim_empleado as (
    -- Puente con la tabla de hechos (agrupando todo el historial SCD2)
    select id_empleado_sk, id_empleado_nk 
    from HGC_DW.GOLD.dim_empleado
),
asistencia as (
    -- Features de control de asistencia
    select 
        de.id_empleado_nk,
        sum(a.minutos_atraso_entrada) as total_minutos_atraso,
        avg(case when a.minutos_atraso_entrada > 0 then a.minutos_atraso_entrada else null end) as promedio_retraso,
        sum(a.horas_trabajadas_reales) as total_horas_trabajadas,
        sum(a.indicador_ausencia) as cantidad_ausencias,
        sum(a.indicador_puntualidad) as veces_puntual
    from HGC_DW.GOLD.fact_asistencia_diaria a
    join dim_empleado de on a.id_empleado_sk = de.id_empleado_sk
    group by 1
)

select
    e.id_empleado_nk,
    e.cargo_titulo,
    e.departamento_nombre,
    
    coalesce(a.total_minutos_atraso, 0) as total_minutos_atraso,
    coalesce(a.promedio_retraso, 0) as promedio_retraso,
    coalesce(a.total_horas_trabajadas, 0) as total_horas_trabajadas,
    coalesce(a.cantidad_ausencias, 0) as cantidad_ausencias,
    coalesce(a.veces_puntual, 0) as veces_puntual

from empleados e
left join asistencia a on e.id_empleado_nk = a.id_empleado_nk