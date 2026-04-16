with snap_producto as (
    select * from {{ ref('snp_producto') }}
),
categoria as (
    select * from {{ ref('stg_postgres__categorias_producto') }}
)

select
    p.*,
    c.nombre_categoria as categoria_nombre
from snap_producto p
left join categoria c on p.id_categoria_nk = c.id_categoria_nk