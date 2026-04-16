with snap_cliente as (
    select * from HGC_DW.snapshots.snp_cliente
)

select
    *,
    -- Cálculo de Edad aproximada usando Snowflake (DATEDIFF)
    floor(datediff(month, fecha_nacimiento, current_date()) / 12) as edad_actual,
    
    -- Lógica de negocio para calcular el rango de edad
    case 
        when floor(datediff(month, fecha_nacimiento, current_date()) / 12) < 18 then 'Menor de 18'
        when floor(datediff(month, fecha_nacimiento, current_date()) / 12) between 18 and 25 then '18 - 25'
        when floor(datediff(month, fecha_nacimiento, current_date()) / 12) between 26 and 35 then '26 - 35'
        when floor(datediff(month, fecha_nacimiento, current_date()) / 12) > 35 then 'Mayor de 35'
        else 'Desconocido'
    end as rango_edad
    -- Nota: El segmento lo puedes cruzar desde la tabla de programa_lealtad si es necesario
from snap_cliente