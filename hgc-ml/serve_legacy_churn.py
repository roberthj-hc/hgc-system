from flask import Flask, request, jsonify
import pickle
import numpy as np
import traceback

app = Flask(__name__)

# Intentar cargar el modelo original, si falla usamos simulador seguro
model = None
try:
    with open("archives/modelo_churn.pkl", "rb") as f:
        model = pickle.load(f)
    print("Modelo Churn Legacy cargado exitosamente.")
except Exception as e:
    print(f"Advertencia: No se pudo cargar el modelo original, se usará simulador matemático estricto. Error: {e}")

@app.route('/invocations', methods=['POST'])
def predict():
    try:
        data = request.json
        # Formato esperado: [dias_sin_comprar, quejas_registradas, ticket_promedio]
        features = data.get("dataframe_split", {}).get("data", [[90, 1, 15.0]])[0]
        
        if model is not None:
             pred = model.predict([features])
             probs = model.predict_proba([features])[0] if hasattr(model, "predict_proba") else [1 if pred[0]<=0 else 0, 1 if pred[0]>0 else 0]
             return jsonify({
                 "predictions": [int(pred[0])], 
                 "probability_percent": int(probs[1]*100) if len(probs)>1 else 50
             })
        else:
             # SIMULADOR MATEMÁTICO:
             dias_inactivo = float(features[0])
             quejas = float(features[1])
             ticket = float(features[2])
             
             riesgo = 5
             
             # Factor 1: Inactividad (El factor principal de Churn silencioso)
             if dias_inactivo > 180: riesgo += 50
             elif dias_inactivo > 90: riesgo += 35
             elif dias_inactivo > 30: riesgo += 15
             
             # Factor 2: Fricción / Satisfacción
             if quejas >= 3: riesgo += 40
             elif quejas >= 1: riesgo += 20
             
             # Factor 3: Gasto (Clientes de alto ticket son más retentivos o son objetivo de competidores)
             if ticket < 10: riesgo += 10
             
             # Limites logicos
             prob_final = max(2, min(99, riesgo))
             
             return jsonify({
                 "predictions": [1 if prob_final >= 60 else 0],
                 "probability_percent": int(prob_final),
                 "simulated": True
             })
             
    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

if __name__ == '__main__':
    print("====== MICROSERVICIO CHURN LEGACY ACTIVADO (Puerto 5008) ======")
    app.run(host='0.0.0.0', port=5008)
