"use strict";
// server/mapGenerator.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMap = generateMap;
const uuid_1 = require("uuid");
function generateMap(config) {
    const obstacles = [];
    const cols = Math.ceil(Math.sqrt(config.obstacleCount));
    const rows = Math.ceil(config.obstacleCount / cols);
    const cellWidth = config.mapWidth / cols;
    const cellHeight = config.mapHeight / rows;
    let count = 0;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (count >= config.obstacleCount)
                break;
            const type = Math.random() > 0.5 ? "rect" : "circle";
            const width = type === "rect" ? 60 + Math.random() * 80 : 40 + Math.random() * 40;
            const height = type === "rect" ? 60 + Math.random() * 80 : width;
            // Décalage aléatoire dans la cellule, mais l'obstacle reste dans la map
            const margin = 10;
            const minX = col * cellWidth + margin;
            const maxX = (col + 1) * cellWidth - width - margin;
            const minY = row * cellHeight + margin;
            const maxY = (row + 1) * cellHeight - height - margin;
            const x = Math.max(minX, Math.min(maxX, minX + Math.random() * (maxX - minX)));
            const y = Math.max(minY, Math.min(maxY, minY + Math.random() * (maxY - minY)));
            obstacles.push({
                id: (0, uuid_1.v4)(),
                x,
                y,
                width,
                height,
                type
            });
            count++;
        }
    }
    return obstacles;
}
