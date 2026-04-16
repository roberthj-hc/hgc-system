{% snapshot snp_sucursal %}

{{
    config(
      target_schema='snapshots',
      unique_key='id_sucursal_nk',
      strategy='check',
      check_cols=['tipo_formato', 'estado_sucursal', 'nombre_gerente'] 
    )
}}

select * from {{ ref('stg_csv__sucursales') }}

{% endsnapshot %}