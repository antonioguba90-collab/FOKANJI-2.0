// ========================================================
// MÓDULO: CONTROLADOR DE MODO DE JUEGO POR FASES (CLÁSICO)
// ========================================================
import { state } from './config.js';
import { sistemaLector, cargarNuevaFase, triggerBossBattle } from './sistemaFases.js';

export const controladorModoFases = {
  // Inicialización específica del modo por fases
  init() {
    sistemaLector.romajisUsadosGlobal = new Set();
    sistemaLector.palabrasFaseActual = [];
    sistemaLector.palabrasFaseAnterior = [];
    sistemaLector.registroFasesPasadas = [];
    sistemaLector.palabrasUnicasCompletadasSet.clear();
    sistemaLector.miniJefesDerrotados = 0;
    sistemaLector.bossMode = false;
    sistemaLector.activeBoss = null;
    sistemaLector.bossTimerAyuda = 0;

    cargarNuevaFase();
  },

// Lógica de actualización paso a paso en cada frame (dentro del update de juego.js)
update(spawnEnemyFn) {
    const totalPalabrasSetActual = sistemaLector.palabrasFaseActual.length > 0 
      ? sistemaLector.palabrasFaseActual.length 
      : 0;    

    // Comprobar si el jugador ha completado todas las palabras del set actual
    if (!sistemaLector.bossMode && totalPalabrasSetActual > 0 && sistemaLector.palabrasUnicasCompletadasSet.size >= totalPalabrasSetActual) {
      state.enemies = []; // Limpiamos enemigos comunes flotantes
      
      // Guardamos las palabras superadas de este set para el examen del guardián
      sistemaLector.palabrasSuperadasFase = [...sistemaLector.palabrasFaseActual];
      
      // Activamos la batalla del jefe/guardián para este set terminado
      triggerBossBattle();
    }

    // Control de la generación de enemigos normales si no estamos en modo jefe
    if (!sistemaLector.bossMode) {
      state.spawnTimer++;
      if (state.spawnTimer >= state.spawnInterval) {
        state.spawnTimer = 0; 
        spawnEnemyFn(); // Llama a la función de spawn que le pasemos desde juego.js
        if (state.spawnInterval > 80) state.spawnInterval -= 2;
      }
    } else {
      if (sistemaLector.activeBoss) sistemaLector.bossTimerAyuda++;
    }
  },
 obtenerPalabraParaSpawn() {
    // 1. Recopilar iniciales y también los ROMAJIS exactos de los enemigos que ya están flotando en la pantalla
    const inicialesEnPantalla = new Set();
    const romajisEnPantalla = new Set();
    
    state.enemies.forEach(e => {
      if (e.romaji) {
        romajisEnPantalla.add(e.romaji);
        if (e.romaji.length > 0) {
          inicialesEnPantalla.add(e.romaji[0]);
        }
      }
    });

    let w = null;

    // 2. --- FILTRADO ESTRICTO Y ABSOLUTO ---
    const palabrasDisponiblesLimpias = sistemaLector.palabrasFaseActual.filter(word => {
      const claveWord = `${word.romaji}_${word.jp}_${word.es}`;
      
      return !sistemaLector.palabrasUnicasCompletadasSet.has(claveWord) && 
             !sistemaLector.palabrasUnicasCompletadasSet.has(word.romaji) &&
             !romajisEnPantalla.has(word.romaji) && // 👈 EVITA QUE SALGA DOS VECES A LA VEZ EN PANTALLA
             !inicialesEnPantalla.has(word.romaji[0]);
    });

    // 3. Si hay palabras que cumplen la regla, elegimos una al azar
    if (palabrasDisponiblesLimpias.length > 0) {
      w = palabrasDisponiblesLimpias[Math.floor(Math.random() * palabrasDisponiblesLimpias.length)];
    }

    return w; 
  }
  }