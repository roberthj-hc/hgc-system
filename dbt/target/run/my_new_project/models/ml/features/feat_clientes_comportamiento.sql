
  
    

create or replace transient table HGC_DW.features.feat_clientes_comportamiento
    
    
    
    as (

with clientes as (
    -- Entidad descriptiva base (Intermediate)
    select * from HGC_DW.SILVER.int_clientes_enriquecidos
),
dim_cliente as (
    -- Puente para enlazar con hechos Gold (historial completo SCD2)
    select id_cliente_sk, id_cliente_nk 
    from HGC_DW.GOLD.dim_cliente
),
ventas as (
    -- Múltiples features pre-calculados
    select 
        dc.id_cliente_nk,
        sum(v.cantidad_vendida) as cantidad_articulos_comprados,
        count(distinct v.nro_pedido_dd) as frecuencia_pedidos,
        sum(v.monto_subtotal_neto) as valor_monetario_total,
        avg(v.monto_subtotal_neto) as ticket_promedio,
        max(to_date(cast(v.id_fecha_sk as varchar), 'YYYYMMDD')) as fecha_ultima_compra,
        min(to_date(cast(v.id_fecha_sk as varchar), 'YYYYMMDD')) as fecha_primera_compra
    from HGC_DW.GOLD.fact_ventas_detalle v
    join dim_cliente dc on v.id_cliente_sk = dc.id_cliente_sk
    group by 1
)

select
    c.id_cliente_nk,
    c.rango_edad,
    
    coalesce(v.cantidad_articulos_comprados, 0) as cantidad_articulos_comprados,
    coalesce(v.frecuencia_pedidos, 0) as frecuencia_pedidos,
    coalesce(v.valor_monetario_total, 0) as valor_monetario_total,
    coalesce(v.ticket_promedio, 0) as ticket_promedio,
    
    v.fecha_ultima_compra,
    v.fecha_primera_compra,

    case 
        when v.fecha_ultima_compra is not null 
        then datediff(day, v.fecha_ultima_compra, current_date()) 
        else 9999 
    end as recencia_dias,
    
    case 
        when v.fecha_primera_compra is not null 
        then datediff(day, v.fecha_primera_compra, current_date()) 
        else 0 
    end as antiguedad_dias

from clientes c
left join ventas v on c.id_cliente_nk = v.id_cliente_nk
    )
;


  