{% snapshot snp_insumo %}

{{
    config(
      target_schema='snapshots',
      unique_key='id_insumo_nk',
      strategy='check',
      check_cols=['costo_unitario', 'activo']
    )
}}

select * from {{ ref('stg_mysql__insumos') }}

{% endsnapshot %}