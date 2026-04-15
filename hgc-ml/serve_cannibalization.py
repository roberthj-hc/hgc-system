from flask import Flask, request, jsonify
import pickle
import numpy as np
import traceback

app = Flask(__name__)

# Intentar cargar el modelo, si falla usamos la simulación
model = None
try:
    with open("archives/modelo_canibalizacion.pkl", "rb") as f:
        model = pickle.load(f)
    print("Modelo cargado exitosamente.")
except Exception as e:
    print(f"Advertencia: No se pudo cargar el modelo original, se usará simulador matemático estricto. Error: {e}")

@app.route('/invocations', methods=['POST'])
def predict():
    try:
        data = request.json
        # Format MLFlow expected: {"dataframe_split": {"columns": [...], "data": [[...]]}}
        features = data.get("dataframe_split", {}).get("data", [[5, 10, 50]])[0]
        
        if model is not None:
             pred = model.predict([features])
             return jsonify({"predictions": [int(pred[0])]})
        else:
             # SIMULADOR MATEMÁTICO:
             # Features: [distancia_km, dif_precio_pct, publico_compartido_pct]
             dist = features[0]
             dif_precio = features[1]
             public_share = features[2]
             
             riesgo_base = 10
             
             # Penalidad por cercanía extrema
             if dist < 2: riesgo_base += 40
             elif dist < 5: riesgo_base += 20
             
             # Penalidad por competir con precios muy similares (guerra de precios)
             if dif_precio < 10: riesgo_base += 20
             elif dif_precio > 30: riesgo_base -= 10
             
             # Penalidad por sobrelapamiento de público
             if public_share > 70: riesgo_base += 30
             elif public_share > 40: riesgo_base += 15
             
             # Cap 0-100
             riesgo_final = max(0, min(100, riesgo_base))
             
             return jsonify({
                 "predictions": [riesgo_final],
                 "simulated": True
             })
             
    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

if __name__ == '__main__':
    print("====== MICROSERVICIO CANIBALIZACIÓN ACTIVADO (Puerto 5006) ======")
    app.run(host='0.0.0.0', port=5006)
