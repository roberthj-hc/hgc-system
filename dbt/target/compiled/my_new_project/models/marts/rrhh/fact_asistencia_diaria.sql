
with asis as (select * from HGC_DW.SILVER.stg_sqlserver__asistencia),
     asign as (select * from HGC_DW.SILVER.stg_sqlserver__asignacion_turnos)

select
    cast(a.id_fecha_nk as integer) as id_fecha_sk,
    coalesce(de_hist.id_empleado_sk, de_curr.id_empleado_sk) as id_empleado_sk,
    dt.id_turno_sk,
    cast(to_char(a.hora_entrada_real, 'HH24MI') as integer) as id_hora_entrada_sk,
    cast(to_char(a.hora_salida_real, 'HH24MI') as integer) as id_hora_salida_sk,

    a.id_asistencia_nk as nro_asistencia_dd,
    asg.estado_asignacion as estado_asignacion_dd,

    a.minutos_atraso_entrada,
    -- Horas netas trabajadas (usando DATEDIFF de Snowflake)
    datediff(minute, a.hora_entrada_real, a.hora_salida_real) / 60.0 as horas_trabajadas_reales,
    0 as minutos_salida_anticipada, -- Requiere lógica compleja contra Dim_Turno, default 0
    case when a.hora_entrada_real is null then 1 else 0 end as indicador_ausencia,
    case when a.minutos_atraso_entrada > 0 then 0 else 1 end as indicador_puntualidad

from asis a
join asign asg on a.id_empleado_nk = asg.id_empleado_nk and a.id_fecha_nk = asg.id_fecha_nk

-- SCD2 fallback logic for empleado
left join HGC_DW.GOLD.dim_empleado de_hist on a.id_empleado_nk = de_hist.id_empleado_nk 
    and a.hora_entrada_real >= de_hist.valido_desde and (a.hora_entrada_real < de_hist.valido_hasta or de_hist.valido_hasta is null)
left join HGC_DW.GOLD.dim_empleado de_curr on a.id_empleado_nk = de_curr.id_empleado_nk and de_curr.es_actual = true

left join HGC_DW.GOLD.dim_turno dt on asg.id_turno_nk = dt.id_turno_nk