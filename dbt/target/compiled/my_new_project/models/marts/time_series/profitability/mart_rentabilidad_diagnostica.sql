

with ventas as (
    select
        id_sucursal_sk,
        id_fecha_sk,
        sum(monto_subtotal_neto) as ingreso_bruto,
        sum(case when dcv.nombre_canal like '%Delivery%' then monto_subtotal_neto * 0.22 else 0 end) as comisiones_delivery
    from HGC_DW.GOLD.fact_ventas_detalle fvd
    join HGC_DW.GOLD.dim_canalventa dcv on fvd.id_canal_sk = dcv.id_canal_sk
    group by 1, 2
),

mermas as (
    select
        id_sucursal_sk,
        id_fecha_sk,
        total_mermas
    from HGC_DW.GOLD.mart_sucursales_consolidado
),

costos_fijos as (
    select
        id_sucursal_sk,
        id_fecha_sk,
        ingreso_bruto * 0.35 as costo_operativo
    from ventas
),

clima_feriados as (
    -- Usamos solo datos reales de DIM_TIEMPO
    select
        id_fecha_sk,
        es_feriado,
        case 
            when dayofweek(to_date(id_fecha_sk::varchar, 'YYYYMMDD')) in (0, 6) then 'Fin de Semana'
            else 'Día Laboral'
        end as factor_dia
    from HGC_DW.GOLD.dim_tiempo
)

select
    v.id_sucursal_sk,
    s.nombre_sucursal,
    v.id_fecha_sk,
    v.ingreso_bruto,
    v.comisiones_delivery,
    m.total_mermas,
    c.costo_operativo,
    (v.ingreso_bruto - v.comisiones_delivery - m.total_mermas - c.costo_operativo) as utilidad_neta,
    cl.es_feriado,
    cl.factor_dia as factor_tiempo
from ventas v
join mermas m on v.id_sucursal_sk = m.id_sucursal_sk and v.id_fecha_sk = m.id_fecha_sk
join costos_fijos c on v.id_sucursal_sk = c.id_sucursal_sk and v.id_fecha_sk = c.id_fecha_sk
join clima_feriados cl on v.id_fecha_sk = cl.id_fecha_sk
join HGC_DW.GOLD.dim_sucursal s on v.id_sucursal_sk = s.id_sucursal_sk