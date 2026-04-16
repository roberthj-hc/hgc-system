{% snapshot snp_empleado %}

{{
    config(
      target_schema='snapshots',
      unique_key='id_empleado_nk',
      strategy='check',
      check_cols=['id_cargo_nk', 'id_sucursal_nk', 'salario_base', 'estado_empleado']
    )
}}

select * from {{ ref('stg_sqlserver__empleados') }}

{% endsnapshot %}