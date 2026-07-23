// ==========================================
// SISTEMA DE APRENDIZAJE, FASES Y JEFES
// ==========================================
import { state } from './config.js';
import { ReproductorMP3 }  from './reproductor.js';
import { MUSIC,mp3 } from '../juego.js';
let musicaGuardianSonando = false;
export const sistemaLector = {
  palabrasFaseActual: [],      
  palabrasFaseAnterior: [],    
  palabrasSuperadasFase: [],   
  registroFasesPasadas: [],    
  palabrasUnicasCompletadasSet: new Set(),
  
  CANTIDAD_NUEVAS: 30,       
  CANTIDAD_REPASO: 0,        
  CANTIDAD_ARCHIVADAS: 30,   
  
  poolRepasoAcumulado: [],   
  romajisUsadosGlobal: new Set(), 

  miniJefesDerrotados: 0, 
  bossMode: false,
  activeBoss: null,
  bossTimerAyuda: 0
};

export function cargarNuevaFase() {
  if (!sistemaLector.romajisUsadosGlobal) {
    sistemaLector.romajisUsadosGlobal = new Set();
  }

  sistemaLector.palabrasSuperadasFase = [];
  sistemaLector.palabrasUnicasCompletadasSet.clear(); 

  // 1. Obtenemos estrictamente las palabras que NUNCA han entrado al romajisUsadosGlobal
  let palabrasDisponiblesNuevas = state.ALL_WORDS_POOL.filter(p => 
    !sistemaLector.romajisUsadosGlobal.has(p.romaji)
  );
  
  // 🛡️ CORRECCIÓN DE SEGURIDAD PARA EL ÚLTIMO SET:
  // Si por algún motivo matemático de filtrado anterior quedan palabras sueltas en el pool general 
  // que el sistema consideraba usadas pero el nivel no ha terminado, 
  // evitamos dejar un set vacío o de 2 palabras asegurando que coja un lote coherente o el resto absoluto.
  if (palabrasDisponiblesNuevas.length === 0 && sistemaLector.romajisUsadosGlobal.size < state.ALL_WORDS_POOL.length) {
    // Forzamos un re-escanéo de emergencia de las que realmente falten por ID/Romaji
    palabrasDisponiblesNuevas = state.ALL_WORDS_POOL.filter(p => 
      !sistemaLector.registroFasesPasadas.some(r => r.romaji === p.romaji)
    );
  }

  if (palabrasDisponiblesNuevas.length === 0) {
    sistemaLector.palabrasFaseActual = [];
    return false;
  }
  
  palabrasDisponiblesNuevas.sort(() => Math.random() - 0.5);
  let nuevoSet = [];
  
  // 2. ADAPTABILIDAD PARA EL ÚLTIMO SET:
  // Si las palabras que quedan son menores a CANTIDAD_NUEVAS (por ejemplo, 15 o 5), 
  // extraemos TODAS las que quedan en lugar de intentar buscar 30.
  const cantidadNuevasAExtraer = palabrasDisponiblesNuevas.length < sistemaLector.CANTIDAD_NUEVAS 
    ? palabrasDisponiblesNuevas.length 
    : Math.min(sistemaLector.CANTIDAD_NUEVAS, palabrasDisponiblesNuevas.length);

  for (let i = 0; i < cantidadNuevasAExtraer; i++) {
    nuevoSet.push(palabrasDisponiblesNuevas.pop());
  }

  sistemaLector.palabrasFaseActual = nuevoSet.sort(() => Math.random() - 0.5);
  sistemaLector.TOTAL_PALABRAS_FASE = sistemaLector.palabrasFaseActual.length;
  sistemaLector.tamañoSetActual = sistemaLector.palabrasFaseActual.length;
  return true;
}
// 🛡️ 1. FUNCIÓN EXCLUSIVA DEL GUARDIÁN (Sale al terminar cada set)
export function triggerGuardianBattle() {
  sistemaLector.bossMode = true;
  state.lockedId = null;
  state.typedLen = 0;
  sistemaLector.bossTimerAyuda = 0;

  if (sistemaLector.palabrasFaseActual.length > 0) {
    sistemaLector.palabrasFaseActual.forEach(p => {
      sistemaLector.romajisUsadosGlobal.add(p.romaji);
      if (!sistemaLector.registroFasesPasadas.some(r => r.romaji === p.romaji)) {
        sistemaLector.registroFasesPasadas.push(p);
      }
    });
    if (sistemaLector.palabrasSuperadasFase.length === 0) {
      sistemaLector.palabrasSuperadasFase = [...sistemaLector.palabrasFaseActual];
    }
  }

  // Preparamos el examen con las palabras superadas del set actual
  let palabrasUnicasJefe = new Set();
  const copiaSuperadas = [...sistemaLector.palabrasSuperadasFase].sort(() => Math.random() - 0.5);

  for (const palabra of copiaSuperadas) {
    if (palabrasUnicasJefe.size >= 8) break;
    palabrasUnicasJefe.add(palabra);
  }

  const poolExamen = Array.from(palabrasUnicasJefe);
  
  sistemaLector.activeBoss = {
    id: 8888, 
    name: `GUARDIÁN: FASE ${sistemaLector.miniJefesDerrotados + 1}`,
    x: state.W / 2, y: -80, targetY: state.H * 0.26,
    radius: Math.min(state.W, state.H) * 0.05 + 18,
    fases: poolExamen,
    faseActual: 0,
    jp: poolExamen[0].jp, romaji: poolExamen[0].romaji, es: poolExamen[0].es,
    isBoss: true
  };

  state.enemies.push(sistemaLector.activeBoss);
  musicaGuardianSonando = true;
  
  mp3.pause();
  mp3.cargar(MUSIC.Guardian);
  mp3.setRepeat(true);
  mp3.play();
}

// 👑 2. FUNCIÓN EXCLUSIVA DEL JEFE FINAL (Solo sale cuando ya no quedan palabras tras un guardián)
export function triggerJefeFinalBattle() {
  sistemaLector.bossMode = true;
  state.lockedId = null;
  state.typedLen = 0;
  sistemaLector.bossTimerAyuda = 0;

  let poolExamenFinal = new Set();
  const todasLasPalabras = [...state.ALL_WORDS_POOL].sort(() => Math.random() - 0.5);
  for (const palabra of todasLasPalabras) {
    if (poolExamenFinal.size >= 8) break;
    poolExamenFinal.add(palabra);
  }

  let poolFinalArray = Array.from(poolExamenFinal);
  let copiaFrases = [...state.BOSS_POOL].sort(() => Math.random() - 0.5);
  
  if (copiaFrases.length > 0) {
    for (let i = 0; i < 3 && i < copiaFrases.length; i++) {
      poolFinalArray.push(copiaFrases[i]);
    }
  } else {
    poolFinalArray.push({ jp: "日本語マスター", romaji: "nihongomasutaa", es: "Maestro del Japonés" });
  }

  sistemaLector.activeBoss = {
    id: 9999,
    name: "JEFE FINAL",
    x: state.W / 2, y: -80, targetY: state.H * 0.28,
    radius: Math.min(state.W, state.H) * 0.065 + 26,
    fases: poolFinalArray,
    faseActual: 0,
    jp: poolFinalArray[0].jp, romaji: poolFinalArray[0].romaji, es: poolFinalArray[0].es,
    isBoss: true
  };

  state.enemies.push(sistemaLector.activeBoss);
  musicaGuardianSonando = true;
  
  mp3.pause();
  mp3.cargar(MUSIC.Jefefinal);
  mp3.setRepeat(true);
  mp3.play();
}