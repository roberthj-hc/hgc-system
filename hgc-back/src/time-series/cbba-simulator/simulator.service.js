const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Buscar el ejecutable de Python con módulos necesarios (pandas, numpy, xgboost, pickle)
function findPythonExec() {
  // NOTA: el venv del proyecto (hgc-ml/venv) NO tiene pandas instalado.
  // Se prioriza el Python del sistema que sí tiene los paquetes completos.
  const candidates = [
    // Python del sistema con módulos completos (verificado en esta máquina)
    "C:\\Users\\Windows\\AppData\\Local\\Python\\pythoncore-3.14-64\\python.exe",
    "C:\\Users\\Windows\\AppData\\Local\\Programs\\Python\\Python313\\python.exe",
    "C:\\Users\\Windows\\AppData\\Local\\Programs\\Python\\Python312\\python.exe",
    "C:\\Users\\Windows\\AppData\\Local\\Programs\\Python\\Python311\\python.exe",
    "C:\\Users\\Windows\\AppData\\Local\\Programs\\Python\\Python310\\python.exe",
    "C:\\Users\\Windows\\AppData\\Local\\Programs\\Python\\Python39\\python.exe",
    "C:\\Python313\\python.exe",
    "C:\\Python312\\python.exe",
    "C:\\Python311\\python.exe",
    "C:\\Python310\\python.exe",
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      console.log(`[Simulator] Using Python: ${candidate}`);
      return `"${candidate}"`;
    }
  }
  // Último recurso: python del PATH
  return 'python';
}

const PYTHON_EXEC = findPythonExec();

const getSimulation = (params) => {
  const { branchId, mkt, price, employees } = params;
  const cacheKey = `${branchId || 'all'}_${mkt || 0}_${price || 0}_${employees || 0}`;
  const CACHE_FILE = path.join(__dirname, `../../../data/sim_result_${cacheKey}.json`);

  return new Promise((resolve, reject) => {
    // 1. Cache check (solo si el archivo tiene contenido válido > 1KB)
    if (fs.existsSync(CACHE_FILE)) {
      try {
        const stats = fs.statSync(CACHE_FILE);
        if (stats.size > 1000) {
          const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
          // Verificar que no sea un objeto de error cacheado
          if (Array.isArray(cached) && cached.length > 0) {
            console.log("Serving Simulation result from Cache JSON");
            return resolve(cached);
          }
        }
        // Si es muy pequeño o no es array, borrarlo
        fs.unlinkSync(CACHE_FILE);
      } catch (e) {
        console.error('Cache read error:', e);
        try { fs.unlinkSync(CACHE_FILE); } catch (_) {}
      }
    }

    // Script de inference
    const scriptPath = path.join(__dirname, "../../../../hgc-ml/scripts/time-series/cbba-simulator/inference.py");

    const cmd = `${PYTHON_EXEC} "${scriptPath}" ${branchId || 'all'} ${mkt || 2500} ${price || 55} ${employees || 10}`;

    console.log(`Running inference with Python: ${PYTHON_EXEC}`);

    exec(cmd, { maxBuffer: 1024 * 1024 * 10, timeout: 90000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Inference exec error: ${error.message}`);
        if (stderr) console.error(`Stderr: ${stderr.substring(0, 300)}`);
        return reject(new Error(`Python execution failed: ${error.message}`));
      }

      if (stderr) {
        console.warn(`Inference warnings: ${stderr.substring(0, 300)}`);
      }

      try {
        const trimmed = stdout.trim();
        if (!trimmed) {
          return reject(new Error('Inference returned empty output'));
        }

        const data = JSON.parse(trimmed);

        // Si el script retornó un error JSON, rechazar sin cachear
        if (data && data.error) {
          return reject(new Error(data.error));
        }

        // Solo cachear si es un array válido con datos
        if (Array.isArray(data) && data.length > 0) {
          try {
            fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
          } catch (wErr) { console.error('Cache write error:', wErr); }
        }

        resolve(data);
      } catch (e) {
        console.error('JSON parse error. stdout:', stdout.substring(0, 400));
        reject(new Error('Failed to parse inference output'));
      }
    });
  });
};

module.exports = { getSimulation };
