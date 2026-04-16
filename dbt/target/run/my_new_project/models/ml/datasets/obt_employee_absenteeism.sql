
  
    

create or replace transient table HGC_DW.training_datasets.obt_employee_absenteeism
    
    
    
    as (

select
    id_empleado_nk,
    cargo_titulo,
    departamento_nombre,
    
    total_minutos_atraso as feature_total_minutos_atraso,
    promedio_retraso as feature_promedio_retraso,
    total_horas_trabajadas as feature_total_horas_trabajadas,
    
    -- TARGET: Predicción de Clasificación (Riesgo alto de ausentismo)
    case 
        when cantidad_ausencias >= 3 then 1 
        else 0 
    end as target_alto_riesgo_ausentismo

from HGC_DW.features.feat_empleados_perfil
    )
;


  