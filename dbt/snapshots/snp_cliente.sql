{% snapshot snp_cliente %}

{{
    config(
      target_schema='snapshots',
      unique_key='id_cliente_nk',
      strategy='check',
      check_cols=['celular', 'email', 'segmento']
    )
}}

select * from {{ ref('stg_mongodb__clientes') }}

{% endsnapshot %}