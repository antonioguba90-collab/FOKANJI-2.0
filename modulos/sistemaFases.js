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

  // Procesar fase anterior si existe
  if (sistemaLector.palabrasFaseActual.length > 0) {
    sistemaLector.palabrasFaseActual.forEach(p => {
      sistemaLector.romajisUsadosGlobal.add(p.romaji);
      if (!sistemaLector.registroFasesPasadas.some(r => r.romaji === p.romaji)) {
        sistemaLector.registroFasesPasadas.push(p);
      }
    });
    sistemaLector.palabrasFaseAnterior = [...sistemaLector.palabrasFaseActual];
  }

  sistemaLector.palabrasSuperadasFase = [];
  sistemaLector.palabrasUnicasCompletadasSet.clear(); 

  let palabrasDisponiblesNuevas = state.ALL_WORDS_POOL.filter(p => 
    !sistemaLector.romajisUsadosGlobal.has(p.romaji)
  );
  
  if (palabrasDisponiblesNuevas.length === 0) {
    sistemaLector.palabrasFaseActual = [];
    return false;
  }
  
  palabrasDisponiblesNuevas.sort(() => Math.random() - 0.5);
  let nuevoSet = [];
  const cantidadNuevasAExtraer = Math.min(sistemaLector.CANTIDAD_NUEVAS, palabrasDisponiblesNuevas.length);
  for (let i = 0; i < cantidadNuevasAExtraer; i++) {
    nuevoSet.push(palabrasDisponiblesNuevas.pop());
  }

  sistemaLector.palabrasFaseActual = nuevoSet.sort(() => Math.random() - 0.5);
  sistemaLector.TOTAL_PALABRAS_FASE = sistemaLector.palabrasFaseActual.length;
  sistemaLector.tamañoSetActual = sistemaLector.palabrasFaseActual.length;
  return true;
}

export function triggerBossBattle() {
  sistemaLector.bossMode = true;
  state.lockedId = null;
  state.typedLen = 0;
  sistemaLector.bossTimerAyuda = 0;

  // 🔒 REGISTRO INMEDIATO: Al entrar al modo jefe, guardamos las palabras actuales en el set global
  if (sistemaLector.palabrasFaseActual.length > 0) {
    sistemaLector.palabrasFaseActual.forEach(p => {
      sistemaLector.romajisUsadosGlobal.add(p.romaji);
      if (!sistemaLector.registroFasesPasadas.some(r => r.romaji === p.romaji)) {
        sistemaLector.registroFasesPasadas.push(p);
      }
    });
    // Guardamos copia de seguridad para el examen del guardián actual
    if (sistemaLector.palabrasSuperadasFase.length === 0) {
      sistemaLector.palabrasSuperadasFase = [...sistemaLector.palabrasFaseActual];
    }
  }

  // Comprobamos si quedan más palabras sin usar en TODO el pool global
  const quedanMasPalabrasGlobales = state.ALL_WORDS_POOL.some(p => !sistemaLector.romajisUsadosGlobal.has(p.romaji));

  // Si ya hemos derrotado mini jefes O si NO quedan más palabras en absoluto, evaluamos si salta el jefe final.
  // PERO si es el primer set (miniJefesDerrotados === 0), obligatoriamente toca el Guardián de set.
  const esPrimerSetGuardian = sistemaLector.miniJefesDerrotados === 0;

  if (esPrimerSetGuardian && sistemaLector.palabrasSuperadasFase.length > 0) {
    // 🛡️ TOCA EL GUARDIÁN DEL SET
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
  } else {
    // 👑 TOCA EL JEFE FINAL SUPREMO (porque ya pasó el guardián y no hay más palabras)
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
  }
  state.enemies.push(sistemaLector.activeBoss);
  musicaGuardianSonando = true;
  
  
  if (sistemaLector.activeBoss.id === 9999) {
    mp3.pause();
    mp3.cargar(MUSIC.Jefefinal); // Música para el Gran Jefe
    mp3.setRepeat(true);
    mp3.play();

  } else {
    mp3.pause();
    mp3.cargar(MUSIC.Guardian);  // Música para el Guardián
    mp3.setRepeat(true);
    mp3.play();
  }
}