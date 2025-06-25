// server/server.ts
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { GameState } from "./gameState";
import { readFileSync } from "fs";

import { resolve } from "path";

const configPath = resolve(__dirname, "../../config.json");
let config;
try {
  config = JSON.parse(readFileSync(configPath, "utf-8"));
  console.log("Configuration loaded successfully");
} catch (err) {
  console.error("Failed to load config.json:", err);
  process.exit(1);
}
const PORT = process.env.PORT || 8080;

function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html': return 'text/html';
    case 'js': return 'application/javascript';
    case 'css': return 'text/css';
    case 'json': return 'application/json';
    case 'png': return 'image/png';
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

const server = createServer((req, res) => {
  const basePath = resolve(__dirname, "../../dist/client");
  let filePath = req?.url && req.url !== "/" ? req.url : "/index.html";
  filePath = filePath.split("?")[0].split("#")[0];
  const fullPath = resolve(basePath, "." + filePath);

  import("fs").then(fs => {
    fs.stat(fullPath, (err, stats) => {
      if (!err && stats.isFile()) {
        res.setHeader('Content-Type', getContentType(filePath));
        fs.createReadStream(fullPath).pipe(res);
      } else {
        // Fallback SPA: retourne index.html
        res.setHeader('Content-Type', 'text/html');
        fs.createReadStream(resolve(basePath, "index.html")).pipe(res);
      }
    });
  });
});
const wss = new WebSocketServer({ server });

const gameState = new GameState(config);

wss.on("connection", (ws) => {
  const playerId = gameState.addPlayer();
  ws.send(JSON.stringify({ type: "init", playerId, config, map: gameState.map }));

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      gameState.handleMessage(playerId, msg);
    } catch (e) {}
  });

  ws.on("close", () => {
    gameState.removePlayer(playerId);
  });
});

// Optimiser la boucle de jeu
let lastUpdate = Date.now();
setInterval(() => {
  const now = Date.now();
  const deltaTime = now - lastUpdate;
  lastUpdate = now;
  
  gameState.update(); // Update game logic
  const state = gameState.getState();
  
  // Envoyer seulement aux clients connectés
  const connectedClients = Array.from(wss.clients).filter(client => client.readyState === 1);
  if (connectedClients.length > 0) {
    const message = JSON.stringify({ type: "state", state });
    connectedClients.forEach(client => {
      client.send(message);
    });
  }
}, 33); // ~30 FPS au lieu de 20 FPS

server.listen(PORT, () => {
  console.log(`🚀 Tank Online Server running on http://localhost:${PORT}`);
  console.log(`🎮 WebSocket available at ws://localhost:${PORT}`);
});