
with oc as (select * from HGC_DW.SILVER.stg_mysql__ordenes_compra),
     doc as (select * from HGC_DW.SILVER.stg_mysql__detalle_oc)

select
    cast(to_char(o.fecha_pedido, 'YYYYMMDD') as integer) as id_fecha_pedido_sk,
    cast(to_char(o.fecha_recepcion_esperada, 'YYYYMMDD') as integer) as id_fecha_recepcion_esperada_sk,
    ds.id_sucursal_sk,
    dp.id_proveedor_sk,
    di.id_insumo_sk,

    o.id_oc_nk as nro_orden_compra_dd,
    d.id_detalle_oc_nk as nro_linea_oc_dd,
    o.estado_oc as estado_oc_dd,

    d.cantidad_comprada,
    d.precio_unitario_compra,
    d.subtotal_compra as monto_subtotal_compra

from doc d
join oc o on d.id_oc_nk = o.id_oc_nk
left join HGC_DW.GOLD.dim_sucursal ds on o.id_sucursal_nk = ds.id_sucursal_nk and ds.es_actual = true
left join HGC_DW.GOLD.dim_proveedor dp on o.id_proveedor_nk = dp.id_proveedor_nk
left join HGC_DW.GOLD.dim_insumo di on d.id_insumo_nk = di.id_insumo_nk and di.es_actual = true