from flask import Flask, request, jsonify
import pickle
import numpy as np
import traceback

app = Flask(__name__)

# Intentar cargar el modelo original, si falla usamos simulador seguro
model = None
try:
    with open("archives/modelo_upselling.pkl", "rb") as f:
        model = pickle.load(f)
    print("Modelo cargado exitosamente.")
except Exception as e:
    print(f"Advertencia: No se pudo cargar el modelo original, se usará simulador matemático estricto. Error: {e}")

@app.route('/invocations', methods=['POST'])
def predict():
    try:
        data = request.json
        # Formato esperado: [cantidad_compras_previas, ticket_promedio, dias_ultima_compra]
        features = data.get("dataframe_split", {}).get("data", [[5, 20.0, 15]])[0]
        
        if model is not None:
             pred = model.predict([features])
             probs = model.predict_proba([features])[0] if hasattr(model, "predict_proba") else [0, 1 if pred[0]>0 else 0]
             return jsonify({
                 "predictions": [int(pred[0])], 
                 "probability_percent": int(probs[1]*100) if len(probs)>1 else 50
             })
        else:
             # SIMULADOR MATEMÁTICO:
             # Features: [cantidad_compras, ticket_promedio, recencia_dias]
             compras = float(features[0])
             ticket = float(features[1])
             recencia = float(features[2])
             
             prob = 10
             
             # Lealtad (A mayor cantidad de compras, más confianza para hacer Upsell)
             if compras >= 10: prob += 35
             elif compras >= 5: prob += 20
             elif compras >= 2: prob += 10
             
             # Nivel de gasto (Usuarios que gastan mucho son menos sensibles a extras de bajo costo)
             if ticket > 50: prob += 25
             elif ticket > 30: prob += 15
             
             # Recencia (Más tiempo sin venir = más enfocado a compra básica, no extras. Reciente = propenso)
             if recencia < 7: prob += 30
             elif recencia < 14: prob += 15
             elif recencia > 30: prob -= 15
             
             # Limites logicos
             prob_final = max(5, min(98, prob))
             
             return jsonify({
                 "predictions": [1 if prob_final >= 50 else 0],
                 "probability_percent": int(prob_final),
                 "simulated": True
             })
             
    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

if __name__ == '__main__':
    print("====== MICROSERVICIO UPSELLING ACTIVADO (Puerto 5007) ======")
    app.run(host='0.0.0.0', port=5007)
