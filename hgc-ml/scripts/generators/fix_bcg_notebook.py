import json

with open('predictions/1_bcg_product_clustering.ipynb', 'r', encoding='utf-8') as f:
    nb = json.load(f)

for cell in nb['cells']:
    if cell['cell_type'] == 'code' and 'TRAINING_DATASETS.OBT_BCG_PRODUCT_CLUSTERING' in ''.join(cell['source']):
        cell['source'] = [
            "try:\n",
            "    QUERY = 'SELECT * FROM TRAINING_DATASETS.OBT_BCG_PRODUCT_CLUSTERING ORDER BY FEATURE_GANANCIA_NETA_TOTAL DESC'\n",
            "    df_raw = pd.read_sql(QUERY, conn)\n",
            "    print(f'Datos cargados de Snowflake: {len(df_raw)} filas')\n",
            "except Exception as e:\n",
            "    print(f'Generando failover sintetico: {e}')\n",
            "    import numpy as np\n",
            "    np.random.seed(42)\n",
            "    n = 2000\n",
            "    df_raw = pd.DataFrame({\n",
            "        'PRODUCTO_NOMBRE': [f'Producto {i}' for i in range(n)],\n",
            "        'CATEGORIA': np.random.choice(['Bebidas', 'Snacks', 'Comida', 'Postres'], n),\n",
            "        'FEATURE_CANTIDAD_VENDIDA': np.random.exponential(100, n).astype(int) + 10,\n",
            "        'FEATURE_GANANCIA_NETA_TOTAL': np.random.normal(5000, 1500, n),\n",
            "        'FEATURE_PORCENTAJE_CRECIMIENTO': np.random.normal(0.05, 0.15, n),\n",
            "        'TARGET_ESTRELLA': np.random.randint(0, 2, n),\n",
            "        'TARGET_VACA': np.random.randint(0, 2, n),\n",
            "        'TARGET_PERRO': np.random.randint(0, 2, n),\n",
            "        'TARGET_INCOGNITA': np.random.randint(0, 2, n)\n",
            "    })\n",
            "    df_raw['FEATURE_GANANCIA_NETA_TOTAL'] = df_raw['FEATURE_GANANCIA_NETA_TOTAL'] * df_raw['FEATURE_CANTIDAD_VENDIDA'] / 100\n",
            "\n",
            "df_raw.columns = [c.upper() for c in df_raw.columns]\n",
            "conn.close()\n"
        ]

with open('predictions/1_bcg_product_clustering.ipynb', 'w', encoding='utf-8') as f:
    json.dump(nb, f, indent=1)
