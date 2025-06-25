// client/main.ts

import { Network } from "./network";
import { updateUI } from "./ui";
import type { Player, Bullet, Mine, Obstacle, GameConfig } from "./types";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
let playerId: string = "";
let config: GameConfig;
let map: Obstacle[] = [];
let camera = { x: 0, y: 0 };

// Setup fullscreen canvas
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);
let state: {
  players: Record<string, Player>;
  bullets: Bullet[];
  mines: Mine[];
  map: Obstacle[];
} = { players: {}, bullets: [], mines: [], map: [] };

let lastBulletCount = 0;
let lastMineCount = 0;
let explosionEffects: Array<{x: number, y: number, time: number}> = [];

const network = new Network();

network.onInit = (msg) => {
  playerId = msg.playerId;
  config = msg.config;
  map = msg.map;
  console.log('Player initialized:', playerId);
};

network.onState = (msg) => {
  state = msg.state;
  const me = state.players[playerId];
  if (me) {
    const playerCount = Object.keys(state.players).length;
    const mineCount = me.mines.length;
    updateUI(me.lives, me.cooldown, playerCount, mineCount);
    
    // Update camera to follow player
    camera.x = me.x - canvas.width / 2;
    camera.y = me.y - canvas.height / 2;
    
    // Keep camera in bounds
    if (config) {
      camera.x = Math.max(0, Math.min(config.mapWidth - canvas.width, camera.x));
      camera.y = Math.max(0, Math.min(config.mapHeight - canvas.height, camera.y));
    }
  }
};

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const me = state.players[playerId];
  if (!me) return;
  const worldX = e.clientX - rect.left + camera.x;
  const worldY = e.clientY - rect.top + camera.y;
  const dx = worldX - me.x;
  const dy = worldY - me.y;
  mouseAngle = Math.atan2(dy, dx);
  
  // Envoyer l'angle du canon moins fréquemment
  if (playerId && Math.abs(mouseAngle - lastCannonAngle) > 0.1) {
    network.send({ type: "cannonAim", angle: mouseAngle });
    lastCannonAngle = mouseAngle;
  }
});

canvas.addEventListener("mousedown", () => {
  if (!playerId) {
    console.log('Player not initialized yet');
    return;
  }
  network.send({ type: "shoot" });
  // Visual feedback for shooting
  const me = state.players[playerId];
  if (me) {
    explosionEffects.push({
      x: me.x + Math.cos(me.cannonAngle) * me.cannonLength,
      y: me.y + Math.sin(me.cannonAngle) * me.cannonLength,
      time: Date.now()
    });
  }
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    if (!playerId) {
      console.log('Player not initialized yet');
      return;
    }
    network.send({ type: "mine" });
  }
});

const keyState: Record<string, boolean> = {};
let lastMove = { forward: 0, turn: 0 };
let mouseAngle = 0;
let lastCannonAngle = 0;

window.addEventListener("keydown", (e) => {
  if (
    ["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight", "KeyZ", "KeyQ", "KeyS", "KeyD"].includes(e.code)
  ) {
    keyState[e.code] = true;
    e.preventDefault();
  }
});

window.addEventListener("keyup", (e) => {
  if (
    ["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight", "KeyZ", "KeyQ", "KeyS", "KeyD"].includes(e.code)
  ) {
    keyState[e.code] = false;
    e.preventDefault();
  }
});

function computeTankMovement() {
  let forward = 0, turn = 0;
  
  // Movement du tank
  if (keyState["ArrowUp"] || keyState["KeyZ"]) forward += 1;
  if (keyState["ArrowDown"] || keyState["KeyS"]) forward -= 1;
  
  // Rotation du tank
  if (keyState["ArrowLeft"] || keyState["KeyQ"]) turn -= 1;
  if (keyState["ArrowRight"] || keyState["KeyD"]) turn += 1;
  
  return { forward, turn };
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Apply camera transform
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  
  // Draw background grid
  ctx.save();
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1;
  const gridSize = 50;
  const startX = Math.floor(camera.x / gridSize) * gridSize;
  const endX = startX + canvas.width + gridSize;
  const startY = Math.floor(camera.y / gridSize) * gridSize;
  const endY = startY + canvas.height + gridSize;
  
  for (let x = startX; x <= endX; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, camera.y);
    ctx.lineTo(x, camera.y + canvas.height);
    ctx.stroke();
  }
  for (let y = startY; y <= endY; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(camera.x, y);
    ctx.lineTo(camera.x + canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();

  // Player movement (tank-style) - envoyer en continu si une touche est enfoncée
  const { forward, turn } = computeTankMovement();
  if ((forward !== 0 || turn !== 0) && playerId) {
    network.send({ type: "move", forward, turn, cannonAngle: mouseAngle });
  } else if ((forward === 0 && turn === 0) && (lastMove.forward !== 0 || lastMove.turn !== 0) && playerId) {
    // Envoyer un arrêt quand on lâche toutes les touches
    network.send({ type: "move", forward: 0, turn: 0, cannonAngle: mouseAngle });
  }
  lastMove = { forward, turn };

  // Draw obstacles
  for (const obs of map) {
    ctx.save();
    ctx.fillStyle = "#666";
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    
    if (obs.type === "rect") {
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    } else {
      ctx.beginPath();
      ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // Draw mines
  for (const mine of state.mines) {
    ctx.save();
    const blinkRate = Math.floor(Date.now() / 200) % 2;
    ctx.fillStyle = mine.exploded ? "#ff0000" : (blinkRate ? "#ff0000" : "#ffff00");
    ctx.strokeStyle = "#cc0000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mine.x, mine.y, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Add warning indicator
    if (!mine.exploded) {
      ctx.fillStyle = "#fff";
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.fillText("!", mine.x, mine.y + 3);
    }
    
    ctx.restore();
  }

  // Draw bullets
  for (const bullet of state.bullets) {
    ctx.save();
    ctx.fillStyle = "#ffff00";
    ctx.strokeStyle = "#ffaa00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Draw tanks according to the new model
  for (const id in state.players) {
    const p = state.players[id];
    if (p.lives <= 0 || Date.now() < p.deadUntil) continue;
    
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    
    // Dessiner les chenilles
    drawTracks(ctx, p);
    
    // Corps du tank
    const isPlayer = id === playerId;
    ctx.fillStyle = isPlayer ? '#4a4a4a' : '#4a4a4a';
    ctx.fillRect(-p.bodyWidth/2, -p.bodyHeight/2, p.bodyWidth, p.bodyHeight);
    
    // Contour du corps
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 2;
    ctx.strokeRect(-p.bodyWidth/2, -p.bodyHeight/2, p.bodyWidth, p.bodyHeight);
    
    // Tourelle
    ctx.fillStyle = isPlayer ? '#5a5a5a' : '#4a4a5a';
    ctx.beginPath();
    ctx.arc(0, 0, p.turretRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Canon
    ctx.save();
    ctx.rotate(p.cannonAngle - p.angle); // Angle relatif au tank
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(0, -p.cannonWidth/2, p.cannonLength, p.cannonWidth);
    ctx.strokeRect(0, -p.cannonWidth/2, p.cannonLength, p.cannonWidth);
    
    // Bout du canon
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.arc(p.cannonLength, 0, p.cannonWidth/2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // Centre de la tourelle
    ctx.fillStyle = isPlayer ? '#6a6a6a' : '#5a5a6a';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // Player name/indicator (outside rotation)
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(-35, -50, 70, 15);
    ctx.fillStyle = isPlayer ? "#4CAF50" : "#2196F3";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(isPlayer ? "YOU" : `P${id.slice(0,3)}`, 0, -40);
    
    // Health indicator
    const healthBarWidth = 50;
    const healthWidth = (p.lives / (config?.maxLives || 3)) * healthBarWidth;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(-25, 35, healthBarWidth, 4);
    ctx.fillStyle = p.lives > 1 ? "#4CAF50" : "#F44336";
    ctx.fillRect(-25, 35, healthWidth, 4);
    
    ctx.restore();
  }
  
  function drawTracks(ctx: CanvasRenderingContext2D, p: any) {
    // Chenille gauche
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(-p.trackLength/2, -p.bodyHeight/2 - p.trackWidth, p.trackLength, p.trackWidth);
    
    // Chenille droite
    ctx.fillRect(-p.trackLength/2, p.bodyHeight/2, p.trackLength, p.trackWidth);
    
    // Détails des chenilles (roues)
    ctx.fillStyle = '#1a1a1a';
    for (let i = -p.trackLength/2 + 10; i < p.trackLength/2; i += 15) {
      // Roues gauches
      ctx.beginPath();
      ctx.arc(i, -p.bodyHeight/2 - p.trackWidth/2, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Roues droites
      ctx.beginPath();
      ctx.arc(i, p.bodyHeight/2 + p.trackWidth/2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Draw explosion effects
  const now = Date.now();
  explosionEffects = explosionEffects.filter(effect => {
    const age = now - effect.time;
    if (age > 200) return false; // Remove after 200ms
    
    ctx.save();
    const alpha = 1 - (age / 200);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffaa00";
    const size = 5 + (age / 200) * 10;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, size, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
    
    return true;
  });
  
  // Restore camera transform
  ctx.restore();

  requestAnimationFrame(gameLoop);
}

gameLoop();
