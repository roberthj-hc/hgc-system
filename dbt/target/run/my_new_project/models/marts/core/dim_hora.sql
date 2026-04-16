
  
    

create or replace transient table HGC_DW.GOLD.dim_hora
    
    
    
    as (
with horas_generadas as (
    select 
        seq4() as minutos_desde_medianoche
    from table(generator(rowcount => 1440)) -- 24 horas * 60 minutos
)
select
    -- SK formato HHMM (Ej. 0830 para las 08:30 AM)
    cast(lpad(floor(minutos_desde_medianoche / 60)::varchar, 2, '0') || lpad((minutos_desde_medianoche % 60)::varchar, 2, '0') as integer) as id_hora_sk,
    floor(minutos_desde_medianoche / 60) as hora_24,
    (minutos_desde_medianoche % 60) as minuto,
    case 
        when floor(minutos_desde_medianoche / 60) between 6 and 11 then 'Mañana'
        when floor(minutos_desde_medianoche / 60) between 12 and 18 then 'Tarde'
        when floor(minutos_desde_medianoche / 60) between 19 and 23 then 'Noche'
        else 'Madrugada'
    end as jornada
from horas_generadas
    )
;


  