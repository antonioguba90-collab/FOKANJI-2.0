import { state, canvas, ctx, hud, msg, mobileInput, menuEl, btnPausa, btnCheatBoss, resize } from './modulos/config.js';
import { parsearLista } from './modulos/parser.js';
import { getAudio, playShoot, playExplosion } from './modulos/audio.js';
import { sistemaLector, cargarNuevaFase, triggerJefeFinalBattle } from './modulos/sistemaFases.js';
import { ejecutarDrawLoop } from './modulos/draw.js';
import { actualizarFisicasYColisiones } from './modulos/fisicas.js';

// Importación de controladores estructurales
import { controladorModoFases } from './modulos/sistemaModoFases.js';
import { controladorModoArcade } from './modulos/sistemaModoArcade.js';
import { ReproductorMP3 }  from './modulos/reproductor.js';

// Importación de los RAW externos de vocabulario
import { HIRAGANA_RAW } from './modos/hiragana.js';
import { KATAKANA_RAW } from './modos/katakana.js';
import { KANJI_NOKEN_5_RAW } from './modos/KANJI_NOKEN_5.js';
import { KANJI_SEMANA_2_RAW } from './modos/KANJI_SEMANA_2.js';
import { KANJI_SEMANA_3_RAW } from './modos/KANJI_SEMANA_3.js';
import { KANJI_SEMANA_4_RAW } from './modos/KANJI_SEMANA_4.js';
import { KANJI_SEMANA_5_RAW } from './modos/KANJI_SEMANA_5.js';
import { KANJI_SEMANA_6_RAW } from './modos/KANJI_SEMANA_6.js';
import { KANJI_SEMANA_7_RAW } from './modos/KANJI_SEMANA_7.js';

const esMovil = window.innerWidth < 768; 
const factorEscalaMovil = esMovil ? 0.7 : 1.0;

const MODES = { 
  hiragana: parsearLista(HIRAGANA_RAW), 
  katakana: parsearLista(KATAKANA_RAW), 
  KANJI_NOKEN_5: parsearLista(KANJI_NOKEN_5_RAW),
  KANJI_SEMANA_2: parsearLista(KANJI_SEMANA_2_RAW),
  KANJI_SEMANA_3: parsearLista(KANJI_SEMANA_3_RAW),
  KANJI_SEMANA_4: parsearLista(KANJI_SEMANA_4_RAW),
  KANJI_SEMANA_5: parsearLista(KANJI_SEMANA_5_RAW),
  KANJI_SEMANA_6: parsearLista(KANJI_SEMANA_6_RAW),
  KANJI_SEMANA_7: parsearLista(KANJI_SEMANA_7_RAW),
};

export const MUSIC = { 
  hiragana: "./audios/musica_hiragana.mp3", 
  katakana: "./audios/musica_katakana.mp3", 
  KANJI_NOKEN_5: "./audios/musica_NOKEN_5.mp3",
  KANJI_SEMANA_2: "./audios/musica_semana2.mp3",
  KANJI_SEMANA_3: "./audios/musica_semana3.mp3",
  KANJI_SEMANA_4: "./audios/musica_semana4.mp3",
  KANJI_SEMANA_5: "./audios/musica_semana5.mp3",
  KANJI_SEMANA_6: "./audios/musica_semana6.mp3",
  KANJI_SEMANA_7: "./audios/musica_semana7.mp3",
  Guardian: "./audios/musica_guardian.mp3",
  Jefefinal: "./audios/musica_JefeFinal.mp3",
};

export let mp3 = new ReproductorMP3();
let musicaGuardianSonando = false;

const MENU_THEME = "./audios/menu_theme.mp3";
state.gameStructure = "fases"; 

btnPausa.addEventListener("click", togglePause);
btnCheatBoss.addEventListener("click", cheatSaltarAlJefe);

function init() {
  document.addEventListener("DOMContentLoaded", () => {
    btnPausa.style.display = "none";
    btnCheatBoss.style.display = "none";
    document.getElementById("view-translation").classList.remove("hidden");
    document.getElementById("view-structure").classList.add("hidden");
    document.getElementById("view-vocabulary").classList.add("hidden");
  });

  const alturaVisible = window.visualViewport ? window.visualViewport.height : state.H;
  state.player = { x: state.W / 2, y: alturaVisible - 80, size: Math.min(state.W, state.H) * 0.04 + 10 };
  state.enemies = []; state.bullets = []; state.particles = []; state.popups = [];
  state.lockedId = null; state.typedLen = 0; state.score = 0; state.kills = 0; 
  state.gameOver = false; state.paused = false; state.spawnTimer = 0; 
  state.spawnInterval = 180; state.nextId = 1;
  
  msg.style.display = "none";
  btnPausa.style.display = "none";
  btnCheatBoss.style.display = "none";

  if (state.gameStructure === "arcade") {
    controladorModoArcade.init();
  } else {
    controladorModoFases.init();
  }
}

function spawnEnemy() {
  if (state.enemies.length >= state.MAX_ENEMIES || sistemaLector.bossMode || state.paused) return;

  const w = (state.gameStructure === "arcade") 
    ? controladorModoArcade.obtenerPalabraParaSpawn() 
    : controladorModoFases.obtenerPalabraParaSpawn();

  if (!w) return;
  
  let x = 60 + Math.random() * (state.W - 120);
  const longLetras = w.romaji.length;
  const radius = (Math.min(state.W, state.H) * 0.024 + 20);
  
  for (let intento = 0; intento < 10; intento++) {
    const solapa = state.enemies.some(e => e.y < state.H * 0.3 && Math.abs(e.x - x) < (radius * 2.5));
    if (!solapa) break;
    x = 60 + Math.random() * (state.W - 120);
  }

  let baseSpeed = 0;
  let speedAdaptada = 0;

  if (state.gameStructure === "arcade") {
    const factorDificultad = state.kills * 0.005; 
    baseSpeed = 0.30 + Math.random() * 0.25 + factorDificultad;
    speedAdaptada = Math.max(0.20, baseSpeed - (longLetras * 0.012)); 
  } else {
    baseSpeed = 0.25 + Math.random() * 0.25;
    speedAdaptada = Math.max(0.12, baseSpeed - (longLetras * 0.015));
  }
  const finalSpeed = speedAdaptada * factorEscalaMovil;

  const paleta = ["#ff5252", "#34ace0", "#33d9b2", "#ffb142", "#ff793f"]; 
  const coloresUsados = new Set(state.enemies.map(e => e.color));
  const colorLibre = paleta.find(c => !coloresUsados.has(c)) || "#ffffff";

  state.enemies.push({
    id: state.nextId++, 
    wordId: w.id, 
    jp: w.jp, romaji: w.romaji, es: w.es, kana: w.kana || w.jp,
    x: x, y: -30, speed: finalSpeed, speedAdaptada, radius: radius, isBoss: false,
    timerAyuda: 0, color: colorLibre,
    vecesAcertada: 0 
  });
}  

function spawnExplosion(x, y, grande = false) {
  const n = grande ? 80 : 30;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = grande ? (2 + Math.random() * 8) : (1 + Math.random() * 5);
    state.particles.push({
      x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1,
      color: `hsl(${grande ? Math.random() * 360 : Math.random() * 40 + 10}, 100%, 60%)`,
      size: grande ? (4 + Math.random() * 5) : (2 + Math.random() * 3),
    });
  }
}

function update() {
  if (state.gameOver || !state.started || state.paused) return;
  
  if (state.gameStructure === "arcade") {
    controladorModoArcade.update(spawnEnemy);
  } else {
    controladorModoFases.update(spawnEnemy);
  }

  actualizarFisicasYColisiones(state, endGame);

  for (const b of state.bullets) {
    const tgt = state.enemies.find(e => e.id === b.targetId);
    if (!tgt) { b.dead = true; continue; }
    const dx = tgt.x - b.x; const dy = tgt.y - b.y; const d = Math.hypot(dx, dy);
    if (d < 15) { 
      b.dead = true;
      if (state.typedLen >= tgt.romaji.length && tgt.id === state.lockedId) {
        if (tgt.isBoss) avanzarFaseJefe(tgt); else destroyLocked();
      }
    } else {
      b.x += (dx / d) * 16; b.y += (dy / d) * 16;
    }
  }
  state.bullets = state.bullets.filter(b => !b.dead);
  for (const p of state.particles) { p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; p.life -= 0.025; }
  state.particles = state.particles.filter(p => p.life > 0);
  for (const p of state.popups) { p.life -= 0.012; p.scale += (1 - p.scale) * 0.15; }
  state.popups = state.popups.filter(p => p.life > 0);

  if (state.lockedId !== null && !state.enemies.find(e => e.id === state.lockedId)) {
    state.lockedId = null; state.typedLen = 0;
  }
}

function fireBullet(targetId) {
  if (!state.player) return;

  const centroX = state.player.x;
  const centroY = state.player.y + 10;
  const puntoSalidaX = centroX; 
  const puntoSalidaY = centroY - (state.player.size * 0.6); 

  state.bullets.push({ 
    x: puntoSalidaX, 
    y: puntoSalidaY, 
    targetId, 
    dead: false 
  });

  if (typeof playShoot === 'function') playShoot();

  state.player.estadoAnim = 'disparar';
  state.player.frameAnim = 0; 
}

let lastChar = ""; let lastTime = 0;
function handleChar(ch) {
  if (state.gameOver || !state.started || state.paused) return;
  if (!/^[a-z0-9 ]$/.test(ch)) return; 

  const ahora = performance.now();
  if (ch === lastChar && (ahora - lastTime) < 70) return; 
  lastChar = ch; lastTime = ahora;

  if (state.lockedId === null) {
    const candidates = state.enemies.filter(e => e.romaji[0] === ch);
    if (candidates.length === 0) return;
    candidates.sort((a, b) => b.y - a.y);
    state.lockedId = candidates[0].id; state.typedLen = 1;
    fireBullet(candidates[0].id);
  } else {
    const target = state.enemies.find(e => e.id === state.lockedId);
    if (!target) { state.lockedId = null; state.typedLen = 0; return; }
    
    if (state.typedLen < target.romaji.length) {
      if (ch === target.romaji[state.typedLen]) {
        state.typedLen++; fireBullet(target.id);
      }
    }
  }
}

function destroyLocked() {
  const target = state.enemies.find(e => e.id === state.lockedId);
  
  if (!target) {
    state.lockedId = null; 
    state.typedLen = 0; 
    return; 
  }

  const claveUnica = `${target.romaji}_${target.jp}_${target.es}`;

  target.vecesAcertada++;

  state.popups.push({ 
    text: target.kana || target.jp, 
    jp: target.es, 
    romaji: target.romaji, 
    life: 2.0, 
    scale: 0.2 
  });

  spawnExplosion(target.x, target.y, false);
  playExplosion();

  if (target.vecesAcertada < 2) {
    state.enemies = state.enemies.filter(e => e.id !== target.id);
    spawnClonEnemigo(target, 1);
    state.lockedId = null; 
    state.typedLen = 0;
  } else {
    if (!state.palabrasContadasGlobalSet.has(claveUnica)) {
      state.palabrasContadasGlobalSet.add(claveUnica);
      if (state.totalPalabrasNivel > 0) state.totalPalabrasNivel--;
    }

    sistemaLector.palabrasUnicasCompletadasSet.add(claveUnica);
    state.enemies = state.enemies.filter(e => e.id !== target.id);
    
    state.score += target.romaji.length * 20;
    state.kills++;
    
    state.lockedId = null; 
    state.typedLen = 0;
  }
}

function spawnClonEnemigo(datosOriginales, contadorAciertos) {
    state.enemies.push({
        id: Date.now() + Math.random(), 
        jp: datosOriginales.jp,
        romaji: datosOriginales.romaji,
        es: datosOriginales.es,
        kana: datosOriginales.kana,
        x: 60 + Math.random() * (state.W - 120),
        y: -30, 
        speed: datosOriginales.speed,
        radius: datosOriginales.radius,
        isBoss: false,
        timerAyuda: 0,
        color: datosOriginales.color,
        vecesAcertada: contadorAciertos
    });
}

function avanzarFaseJefe(target) {
  spawnExplosion(target.x, target.y, false); playExplosion();
  state.popups.push({ text: target.jp, jp: target.es, romaji: target.romaji, life: 2.0, scale: 0.3 });
  target.faseActual++;
  
  if (target.faseActual < target.fases.length) {
    const proxFrase = target.fases[target.faseActual];
    target.jp = proxFrase.jp; target.romaji = proxFrase.romaji; target.es = proxFrase.es;
    sistemaLector.bossTimerAyuda = 0; state.typedLen = 0; 
  } else {
    spawnExplosion(target.x, target.y, true); 
    state.enemies = state.enemies.filter(e => e.id !== target.id);
    state.score += 500; state.kills++;
    
    const eraJefeFinal = target.id === 9999; 

    sistemaLector.bossMode = false; 
    sistemaLector.activeBoss = null;
    state.lockedId = null; 
    state.typedLen = 0;
    
    if (state.gameStructure !== "arcade") {
      if (eraJefeFinal) {
        winGame();
        return;
      }

      sistemaLector.miniJefesDerrotados++;
      
      // 🔍 VERIFICACIÓN ROBUSTA DEL POOL GLOBAL RESTANTE
      const tieneMasPalabras = state.ALL_WORDS_POOL.some(p => {
        const clave = `${p.romaji}_${p.jp}_${p.es}`;
        return !sistemaLector.romajiUsadoGlobal.has(clave);
      });

      if (tieneMasPalabras) {
        musicaGuardianSonando = false; 
        mp3.pause();
        mp3.cargar(MUSIC[state.currentMode]);
        mp3.setRepeat(true);
        mp3.play();

        cargarNuevaFase();
        state.spawnTimer = 0;
        state.spawnInterval = 180;
      } else {
        // Si ya no quedan palabras en el pool global, transiciona correctamente al Jefe Final
        mp3.pause();
        triggerJefeFinalBattle(); 
      }
    }
  }
}

function cheatSaltarAlJefe() {
  state.enemies = [];

  if (!state.started || state.gameOver || state.paused || sistemaLector.bossMode) return;

  if (state.gameStructure === "arcade") {
    state.kills = controladorModoArcade.proximoHitoJefe;
  } else {
    sistemaLector.palabrasFaseActual.forEach(word => {
      const clave = `${word.romaji}_${word.jp}_${word.es}`;
      sistemaLector.palabrasUnicasCompletadasSet.add(clave);
    });

    const totalObjetivo = sistemaLector.CANTIDAD_NUEVAS + sistemaLector.CANTIDAD_REPASO;
    let rellenoId = 0;
    while (sistemaLector.palabrasUnicasCompletadasSet.size < totalObjetivo) {
      sistemaLector.palabrasUnicasCompletadasSet.add(`cheat_force_match_${rellenoId++}`);
    }

    if (sistemaLector.palabrasSuperadasFase.length === 0) {
      sistemaLector.palabrasSuperadasFase = [...sistemaLector.palabrasFaseActual];
    }
  }

  state.enemies = []; 
  state.lockedId = null; 
  state.typedLen = 0;

  update();
}

function togglePause() {
  if (!state.started || state.gameOver) return;
  state.paused = !state.paused;

  if (state.paused) {
    btnPausa.innerHTML = "▶️ Reanudar";
    mp3.pause();
    msg.innerHTML = `
      <div style="font-size: 16px; font-weight: bold; color: #ffffff; font-family: 'Courier New', monospace; margin: 0 0 16px; background: rgba(0, 0, 0, 0.3); padding: 8px 12px; border-radius: 6px; text-shadow: 1px 1px 2px #000;">JUEGO EN PAUSA</div>
      <button id="btn-resume" style="font-family: 'Courier New', monospace; font-weight: bold; background: #25a; border: 2px solid #000000; padding: 10px 20px; font-size: 16px; margin: 5px; cursor: pointer; color: #fff; width: 200px;">Reanudar juego</button><br>
      <button id="btn-restart" style="font-family: 'Courier New', monospace; font-weight: bold; background: #229daa; border: 2px solid #000000; padding: 10px 20px; font-size: 16px; margin: 5px; cursor: pointer; color: #fff; width: 200px;">Volver a empezar</button><br>
      <button id="btn-menu" style="font-family: 'Courier New', monospace; font-weight: bold; background: #f0040f; border: 2px solid #000000; padding: 10px 20px; font-size: 16px; margin-top: 15px; cursor: pointer; color: #fff; width: 200px;">Cambiar modo</button>`;
    msg.style.display = "block"; mobileInput.blur();
    
    document.getElementById("btn-resume").addEventListener("click", togglePause);
    document.getElementById("btn-restart").addEventListener("click", () => startGame(state.currentMode));
    document.getElementById("btn-menu").addEventListener("click", showMenu);
  } else {
    btnPausa.innerHTML = "⏸️ Pausa"; msg.style.display = "none"; mobileInput.focus();
    mp3.play();
  }
}

function endGame() {
  state.gameOver = true;
  state.started = false;
  document.getElementById("hud").classList.add("hidden");
  mp3.pause();
  btnPausa.style.display = "none"; btnCheatBoss.style.display = "none";
  spawnExplosion(state.player.x, state.player.y, true); playExplosion();
  const modeName = { hiragana: "Hiragana", katakana: "Katakana", kanji: "Kanji", kanji_n5: "Kanji N5" }[state.currentMode] || "Kanji Especial";
  msg.innerHTML = `GAME OVER<br>Modo: ${modeName}<br>Puntos: ${state.score}<br><button id="retry">Reintentar</button> <button id="changeMode">Cambiar modo</button>`;
  msg.style.display = "block"; mobileInput.blur();
  setTimeout(() => {
    document.getElementById("retry")?.addEventListener("click", () => startGame(state.currentMode));
    document.getElementById("changeMode")?.addEventListener("click", () => showMenu());
  }, 0);
}

function winGame() {
  state.gameOver = true;
  mp3.pause();
  btnPausa.style.display = "none";
  btnCheatBoss.style.display = "none";
  
  spawnExplosion(state.player.x, state.player.y, true);
  playExplosion();

  msg.innerHTML = `🏆 ¡NIVEL FINALIZADO! 🏆<br>
                   ¡Felicidades, has dominado todo el vocabulario!<br><br>
                   Puntos totales: ${state.score}<br><br>
                   <button id="win-retry" style="padding:10px 20px; font-size:16px; margin:5px; cursor:pointer;">Volver a jugar</button><br>
                   <button id="win-changeVocabulary" style="padding:10px 20px; font-size:16px; margin:5px; cursor:pointer; background:#25a;">Cambiar de nivel</button><br>
                   <button id="win-changeMode" style="padding:10px 20px; font-size:16px; margin:5px; cursor:pointer; background:#555;">Cambiar de modo</button>`;
  
  msg.style.display = "block";
  mobileInput.blur();

  setTimeout(() => {
    document.getElementById("win-retry")?.addEventListener("click", () => startGame(state.currentMode));
    
    document.getElementById("win-changeVocabulary")?.addEventListener("click", () => {
      state.started = false;
      menuEl.style.display = "block";
      msg.style.display = "none";
      document.getElementById("view-structure").classList.add("hidden");
      document.getElementById("view-vocabulary").classList.remove("hidden");
    });

    document.getElementById("win-changeMode")?.addEventListener("click", () => showMenu());
  }, 0);
}

function startGame(mode) {
  if (mode && MODES[mode]) {
    state.currentMode = mode;
    state.ALL_WORDS_POOL = MODES[mode].normales;
    state.BOSS_POOL = MODES[mode].jefe;
    
    state.totalPalabrasNivel = state.ALL_WORDS_POOL.length;
    state.palabrasContadasGlobalSet = new Set();
    if (state.mostrarTraduccion === undefined) state.mostrarTraduccion = false;

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById("game").classList.remove("hidden");
    credits.classList.add('hidden');
    document.getElementById("hud").classList.remove("hidden");

    resize();
    state.started = true;
    menuEl.classList.add("hidden");
    mp3.pause();
    
    if (mode && MUSIC[mode]) {
      state.currentMode = mode;
      musicaGuardianSonando = false;
      mp3.cargar(MUSIC[mode]);
      mp3.setRepeat(true);
      mp3.play();
    }
  
    if (!state.gameStructure) {
      state.gameStructure = "fases"; 
    }

    init(); 
    state.started = true;
    menuEl.style.display = "none"; 
    msg.style.display = "none";
    btnPausa.style.display = "block"; 
    btnPausa.innerHTML = "⏸️ Pausa";
    btnCheatBoss.style.display = "block"; 
    mobileInput.style.pointerEvents = "auto";
    getAudio(); 
    mobileInput.focus();
  }
}

function showMenu() {
  state.started = false;
  state.paused = false;
  mp3.pause();
  
  mp3.cargar(MENU_THEME);
  mp3.setRepeat(true);
  mp3.play();

  document.getElementById("game").classList.add("hidden");
  document.getElementById("hud").classList.add("hidden");
  btnPausa.style.display = "none"; 
  btnCheatBoss.style.display = "none";
  
  const menuEl = document.getElementById("menu");
  menuEl.classList.remove("hidden");
  menuEl.style.display = "block";

  document.getElementById("msg").style.display = "none";
  
  document.getElementById("view-translation").classList.remove("hidden");
  document.getElementById("view-structure").classList.add("hidden");
  document.getElementById("view-vocabulary").classList.add("hidden");
  document.getElementById("credits").classList.remove("hidden");
  
  mobileInput.style.pointerEvents = "none"; 
  mobileInput.blur();
}

const startScreen = document.getElementById("start-screen");
const btnStart = document.getElementById("btn-start");

document.getElementById('btn-start').addEventListener('click', () => {
    document.getElementById('start-screen').classList.add('hidden');
    mp3.cargar(MENU_THEME);
    mp3.setRepeat(true);
    mp3.play();
    
    document.getElementById('menu').classList.remove('hidden');
    credits.classList.remove('hidden');
  
    const ac = getAudio();
    if (ac.state === 'suspended') {
      ac.resume();
    }
});

document.getElementById("btn-with-translation").addEventListener("click", () => {
  state.mostrarTraduccion = true;
  document.getElementById("view-translation").classList.add("hidden");
  document.getElementById("view-structure").classList.remove("hidden");
});

document.getElementById("id-no-translation").addEventListener("click", () => {
  state.mostrarTraduccion = false;
  document.getElementById("view-translation").classList.add("hidden");
  document.getElementById("view-structure").classList.remove("hidden");
});

document.getElementById("btn-back-translation").addEventListener("click", () => {
  document.getElementById("view-structure").classList.add("hidden");
  document.getElementById("view-translation").classList.remove("hidden");
});

document.querySelectorAll("#view-structure button[data-structure]").forEach(btn => {
  btn.addEventListener("click", () => {
    state.gameStructure = btn.dataset.structure;
    document.getElementById("view-structure").classList.add("hidden");
    document.getElementById("view-vocabulary").classList.remove("hidden");
  });
});

document.querySelectorAll("#view-vocabulary button:not(#btn-back-structure)").forEach(btn => {
  btn.addEventListener("click", () => {
    startGame(btn.dataset.mode);
  });
});

document.getElementById("btn-back-structure").addEventListener("click", () => {
  document.getElementById("view-vocabulary").classList.add("hidden");
  document.getElementById("view-structure").classList.remove("hidden");
});

window.addEventListener("keydown", (ev) => {
  if (ev.key.toLowerCase() === "+") { togglePause(); return; } 
  if (!state.started || state.paused) return;
  if (ev.repeat) return; 
  if (state.gameOver) { if (ev.key === "Enter") startGame(state.currentMode); return; }
  handleChar(ev.key.toLowerCase());
});

mobileInput.addEventListener("input", () => {
  const val = mobileInput.value; 
  for (const ch of val) handleChar(ch.toLowerCase()); 
  mobileInput.value = "";
});

mobileInput.addEventListener("touchend", (ev) => { 
  ev.preventDefault(); 
  mobileInput.focus(); 
}, { passive: false });

mobileInput.addEventListener("blur", () => {
  if (state.started && !state.gameOver && !state.paused) { 
    setTimeout(() => { 
      if (state.started && !state.gameOver && !state.paused) mobileInput.focus(); 
    }, 50); 
  }
});

function loop() { 
  update(); 
  ejecutarDrawLoop(); 
  requestAnimationFrame(loop); 
}

init();
resize();
loop();