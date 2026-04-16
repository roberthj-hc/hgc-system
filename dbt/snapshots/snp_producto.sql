{% snapshot snp_producto %}

{{
    config(
      target_schema='snapshots',
      unique_key='id_producto_nk',
      strategy='check',
      check_cols=['precio_base', 'costo_estandar', 'activo']
    )
}}

select * from {{ ref('stg_postgres__productos') }}

{% endsnapshot %}