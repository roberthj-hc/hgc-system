
  create or replace   view HGC_DW.SILVER.int_demanda_insumos
  
  
  
  
  as (
    /*
    INTERMEDIATE: int_demanda_insumos
    ---------------------------------
    Consolida el consumo diario de insumos por almacén.
    Cruza movimientos de salida con datos de insumos, stock y lead time de compras.
    
    Fuentes (Silver):
      - stg_mysql__movimientos_inventario (salidas = consumo)
      - stg_mysql__insumos (nombre, unidad, costo)
      - stg_mysql__stock (punto reorden, stock min/max)
      - stg_mysql__ordenes_compra + detalle_oc (lead time)
      - stg_mysql__recetas_bom (relación producto-insumo)
*/

with movimientos_salida as (
    -- Solo movimientos de SALIDA representan consumo/demanda real
    select
        id_insumo_nk,
        id_almacen_nk,
        cast(fecha_hora_movimiento as date) as fecha_consumo,
        sum(cantidad_movimiento) as cantidad_consumida_dia,
        count(*) as num_movimientos_dia
    from HGC_DW.SILVER.stg_mysql__movimientos_inventario
    where lower(tipo_movimiento) = 'salida'
    group by 1, 2, 3
),

insumos as (
    select
        id_insumo_nk,
        nombre_insumo,
        unidad_medida,
        costo_unitario,
        activo
    from HGC_DW.SILVER.stg_mysql__insumos
),

stock_actual as (
    select
        id_insumo_nk,
        id_almacen_nk,
        cantidad_actual,
        punto_reorden,
        stock_minimo,
        stock_maximo
    from HGC_DW.SILVER.stg_mysql__stock
),

lead_time_compras as (
    -- Lead time = días entre fecha_pedido y fecha_recepción_esperada por insumo
    select
        doc.id_insumo_nk,
        avg(datediff(day, oc.fecha_pedido, oc.fecha_recepcion_esperada)) as lead_time_promedio_dias,
        count(distinct oc.id_oc_nk) as total_ordenes_compra,
        avg(doc.precio_unitario_compra) as precio_compra_promedio
    from HGC_DW.SILVER.stg_mysql__detalle_oc doc
    join HGC_DW.SILVER.stg_mysql__ordenes_compra oc on doc.id_oc_nk = oc.id_oc_nk
    group by 1
),

recetas as (
    -- Cuántos productos usan cada insumo (criticidad del insumo)
    select
        id_insumo_nk,
        count(distinct id_producto_nk) as num_productos_dependientes,
        avg(cantidad_requerida) as cantidad_promedio_por_receta
    from HGC_DW.SILVER.stg_mysql__recetas_bom
    group by 1
)

select
    ms.id_insumo_nk,
    ms.id_almacen_nk,
    ms.fecha_consumo,
    ms.cantidad_consumida_dia,
    ms.num_movimientos_dia,

    -- Datos del insumo
    i.nombre_insumo,
    i.unidad_medida,
    i.costo_unitario,

    -- Stock actual
    coalesce(s.cantidad_actual, 0) as stock_actual,
    coalesce(s.punto_reorden, 0) as punto_reorden,
    coalesce(s.stock_minimo, 0) as stock_minimo,
    coalesce(s.stock_maximo, 0) as stock_maximo,

    -- Lead time de compras
    coalesce(lt.lead_time_promedio_dias, 0) as lead_time_promedio_dias,
    coalesce(lt.total_ordenes_compra, 0) as total_ordenes_compra,
    coalesce(lt.precio_compra_promedio, i.costo_unitario) as precio_compra_promedio,

    -- Criticidad (BOM)
    coalesce(r.num_productos_dependientes, 0) as num_productos_dependientes,
    coalesce(r.cantidad_promedio_por_receta, 0) as cantidad_promedio_por_receta

from movimientos_salida ms
left join insumos i on ms.id_insumo_nk = i.id_insumo_nk
left join stock_actual s on ms.id_insumo_nk = s.id_insumo_nk and ms.id_almacen_nk = s.id_almacen_nk
left join lead_time_compras lt on ms.id_insumo_nk = lt.id_insumo_nk
left join recetas r on ms.id_insumo_nk = r.id_insumo_nk
  );

