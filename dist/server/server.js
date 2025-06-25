"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// server/server.ts
const http_1 = require("http");
const ws_1 = require("ws");
const gameState_1 = require("./gameState");
const fs_1 = require("fs");
const path_1 = require("path");
const configPath = (0, path_1.resolve)(__dirname, "../../config.json");
let config;
try {
    config = JSON.parse((0, fs_1.readFileSync)(configPath, "utf-8"));
    console.log("Configuration loaded successfully");
}
catch (err) {
    console.error("Failed to load config.json:", err);
    process.exit(1);
}
const PORT = process.env.PORT || 8080;
function getContentType(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'html': return 'text/html';
        case 'js': return 'application/javascript';
        case 'css': return 'text/css';
        case 'json': return 'application/json';
        case 'png': return 'image/png';
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        case 'svg': return 'image/svg+xml';
        default: return 'application/octet-stream';
    }
}
const server = (0, http_1.createServer)((req, res) => {
    const basePath = (0, path_1.resolve)(__dirname, "../../dist/client");
    let filePath = req?.url && req.url !== "/" ? req.url : "/index.html";
    filePath = filePath.split("?")[0].split("#")[0];
    const fullPath = (0, path_1.resolve)(basePath, "." + filePath);
    Promise.resolve().then(() => __importStar(require("fs"))).then(fs => {
        fs.stat(fullPath, (err, stats) => {
            if (!err && stats.isFile()) {
                res.setHeader('Content-Type', getContentType(filePath));
                fs.createReadStream(fullPath).pipe(res);
            }
            else {
                // Fallback SPA: retourne index.html
                res.setHeader('Content-Type', 'text/html');
                fs.createReadStream((0, path_1.resolve)(basePath, "index.html")).pipe(res);
            }
        });
    });
});
const wss = new ws_1.WebSocketServer({ server });
const gameState = new gameState_1.GameState(config);
wss.on("connection", (ws) => {
    const playerId = gameState.addPlayer();
    ws.send(JSON.stringify({ type: "init", playerId, config, map: gameState.map }));
    ws.on("message", (data) => {
        try {
            const msg = JSON.parse(data.toString());
            gameState.handleMessage(playerId, msg);
        }
        catch (e) { }
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
