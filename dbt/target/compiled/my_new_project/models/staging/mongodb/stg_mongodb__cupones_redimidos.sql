with source as (select * from HGC_DW.BRONZE_MONGODB.cupones_redimidos)
select
    id_redencion as id_redencion_nk,
    id_cupon as id_cupon_nk,
    id_pedido as id_pedido_nk,
    cast(monto_descuento as numeric(10,2)) as monto_descuento_real_otorgado
from source