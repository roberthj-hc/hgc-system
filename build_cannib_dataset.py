"""
Construye el dataset real de Canibalizacion usando:
- Distancias geograficas reales entre las 12 sucursales HGC (coordenadas GPS de los barrios)
- Publico compartido: % de productos que ambas sucursales venden
- Diferencia de precio: diferencia de precio promedio entre pares
- Riesgo de canibalizacion: calculado desde datos reales de ventas
NO modifica ninguna BD. Solo lee y calcula.
"""
import snowflake.connector, os, pandas as pd, numpy as np
from dotenv import load_dotenv
from math import radians, cos, sin, asin, sqrt
load_dotenv()

conn = snowflake.connector.connect(
    user=os.getenv('SNOWFLAKE_USER'), password=os.getenv('SNOWFLAKE_PASSWORD'),
    account=os.getenv('SNOWFLAKE_ACCOUNT'),
    warehouse=os.getenv('SNOWFLAKE_WAREHOUSE', 'COMPUTE_WH'),
    database=os.getenv('SNOWFLAKE_DATABASE', 'HGC_DB')
)
cur = conn.cursor()

# ── Coordenadas GPS reales de los barrios (fuente: Google Maps) ───────────────
COORDS = {
    '1':  (-16.4955, -68.1336),  # Miraflores La Paz (Av Busch)
    '2':  (-16.5002, -68.1368),  # Centro La Paz (El Prado)
    '3':  (-16.5310, -68.0900),  # Calacoto La Paz
    '4':  (-16.5000, -68.1200),  # Sopocachi La Paz
    '5':  (-16.4975, -68.1527),  # La Ceja El Alto
    '6':  (-16.4800, -68.1560),  # Ciudad Satelite El Alto
    '7':  (-16.4600, -68.1750),  # Rio Seco El Alto
    '8':  (-17.3930, -66.1568),  # Centro Cochabamba (El Prado)
    '9':  (-17.3700, -66.1900),  # Zona Norte Cochabamba
    '10': (-17.7841, -63.1812),  # Av Monsenor Rivero Santa Cruz
    '11': (-17.8350, -63.2400),  # Plan 3000 Santa Cruz
    '12': (-17.7700, -63.2000),  # Equipetrol Santa Cruz
}

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1)*cos(lat2)*sin(dlon/2)**2
    return 2 * R * asin(sqrt(a))

# ── Cargar sucursales ─────────────────────────────────────────────────────────
cur.execute("SELECT ID_SUCURSAL_NK, ID_SUCURSAL_SK, NOMBRE_SUCURSAL, CIUDAD, TIPO_FORMATO FROM GOLD.DIM_SUCURSAL WHERE ES_ACTUAL = TRUE ORDER BY ID_SUCURSAL_NK::INT")
suc = pd.DataFrame(cur.fetchall(), columns=['NK','SK','NOMBRE','CIUDAD','FORMATO'])
print(f"Sucursales: {len(suc)}")

# ── Ventas por sucursal (ticket promedio y total) ─────────────────────────────
cur.execute("""
    SELECT s.ID_SUCURSAL_NK,
           AVG(v.PRECIO_UNITARIO_VENTA) as precio_promedio,
           COUNT(DISTINCT v.NRO_PEDIDO_DD) as total_tickets,
           SUM(v.MONTO_SUBTOTAL_NETO) as total_ventas
    FROM GOLD.FACT_VENTAS_DETALLE v
    JOIN GOLD.DIM_SUCURSAL s ON v.ID_SUCURSAL_SK = s.ID_SUCURSAL_SK
    WHERE s.ES_ACTUAL = TRUE
    GROUP BY s.ID_SUCURSAL_NK
""")
ventas = pd.DataFrame(cur.fetchall(), columns=['NK','PRECIO_PROM','TICKETS','VENTAS'])
ventas['NK'] = ventas['NK'].astype(str)
print("Ventas por sucursal:")
print(ventas.to_string())

# ── Productos por sucursal (para calcular publico compartido) ─────────────────
cur.execute("""
    SELECT s.ID_SUCURSAL_NK, v.ID_PRODUCTO_SK
    FROM GOLD.FACT_VENTAS_DETALLE v
    JOIN GOLD.DIM_SUCURSAL s ON v.ID_SUCURSAL_SK = s.ID_SUCURSAL_SK
    WHERE s.ES_ACTUAL = TRUE
    GROUP BY s.ID_SUCURSAL_NK, v.ID_PRODUCTO_SK
""")
prods = pd.DataFrame(cur.fetchall(), columns=['NK','PROD_SK'])
prods['NK'] = prods['NK'].astype(str)
prod_sets = prods.groupby('NK')['PROD_SK'].apply(set).to_dict()
print(f"\nProductos unicos por sucursal calculados.")

# ── Construir dataset de pares de sucursales ──────────────────────────────────
records = []
nks = suc['NK'].tolist()
ventas_dict = ventas.set_index('NK').to_dict('index')

for i in range(len(nks)):
    for j in range(i+1, len(nks)):
        nk_a, nk_b = str(nks[i]), str(nks[j])
        if nk_a not in COORDS or nk_b not in COORDS:
            continue
        # Distancia
        lat_a, lon_a = COORDS[nk_a]
        lat_b, lon_b = COORDS[nk_b]
        dist = round(haversine(lat_a, lon_a, lat_b, lon_b), 2)
        # Publico compartido (Jaccard de productos)
        set_a = prod_sets.get(nk_a, set())
        set_b = prod_sets.get(nk_b, set())
        if set_a and set_b:
            jaccard = len(set_a & set_b) / len(set_a | set_b)
        else:
            jaccard = 0.0
        # Diferencia de precio
        pa = ventas_dict.get(nk_a, {}).get('PRECIO_PROM', 0) or 0
        pb = ventas_dict.get(nk_b, {}).get('PRECIO_PROM', 0) or 0
        diff_precio = abs(float(pa) - float(pb))
        # Riesgo de canibalizacion:
        # Mayor con menos distancia, mas publico compartido y menos diferencia de precio
        # Formula: riesgo = publico_compartido * (1 - dist_norm) * (1 - diff_precio_norm)
        records.append({
            'SUC_A': nk_a, 'SUC_B': nk_b,
            'NOMBRE_A': suc[suc['NK']==nks[i]]['NOMBRE'].values[0],
            'NOMBRE_B': suc[suc['NK']==nks[j]]['NOMBRE'].values[0],
            'DISTANCIA_KM': dist,
            'PUBLICO_COMPARTIDO': round(jaccard, 4),
            'DIFERENCIA_PRECIO': round(diff_precio, 2),
        })

df = pd.DataFrame(records)
print(f"\nPares de sucursales: {len(df)}")

# Normalizar para calcular riesgo
df['dist_norm'] = df['DISTANCIA_KM'] / df['DISTANCIA_KM'].max()
df['precio_norm'] = df['DIFERENCIA_PRECIO'] / (df['DIFERENCIA_PRECIO'].max() + 1e-9)
# Riesgo: alta similitud de publico + poca distancia + poca diferencia precio = alto riesgo
df['RIESGO_CANIBALIZACION'] = (
    df['PUBLICO_COMPARTIDO'] * 0.5 +
    (1 - df['dist_norm']) * 0.4 +
    (1 - df['precio_norm']) * 0.1
) * 100
df['RIESGO_CANIBALIZACION'] = df['RIESGO_CANIBALIZACION'].round(2)

print("\nDataset final de pares:")
print(df[['NOMBRE_A','NOMBRE_B','DISTANCIA_KM','PUBLICO_COMPARTIDO','DIFERENCIA_PRECIO','RIESGO_CANIBALIZACION']].to_string())
print(f"\nRiesgo promedio: {df['RIESGO_CANIBALIZACION'].mean():.1f}%")
print(f"Riesgo max: {df['RIESGO_CANIBALIZACION'].max():.1f}%")
print(f"Riesgo min: {df['RIESGO_CANIBALIZACION'].min():.1f}%")

# Guardar para usar en el notebook
import json
out = df[['DISTANCIA_KM','PUBLICO_COMPARTIDO','DIFERENCIA_PRECIO','RIESGO_CANIBALIZACION','NOMBRE_A','NOMBRE_B']].to_dict(orient='records')
with open('cannibalization_real_dataset.json', 'w') as f:
    json.dump(out, f, indent=2)
print("\nDataset guardado en cannibalization_real_dataset.json")
