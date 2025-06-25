// server/gameState.ts
import { v4 as uuidv4 } from "uuid";
import { generateMap, Obstacle } from "./mapGenerator";

export interface Player {
  id: string;
  x: number;
  y: number;
  angle: number; // Angle du tank
  cannonAngle: number; // Angle du canon (absolu)
  lives: number;
  cooldown: number;
  deadUntil: number;
  mines: Mine[];
  // Dimensions du tank
  bodyWidth: number;
  bodyHeight: number;
  turretRadius: number;
  cannonLength: number;
  cannonWidth: number;
  trackWidth: number;
  trackLength: number;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: string;
}

export interface Mine {
  id: string;
  x: number;
  y: number;
  placedAt: number;
  owner: string;
  exploded: boolean;
}

export class GameState {
  players: Record<string, Player> = {};
  bullets: Bullet[] = [];
  mines: Mine[] = [];
  map: Obstacle[];
  config: any;
  private gameLoopInterval: NodeJS.Timeout | null = null;

  constructor(config: any) {
    this.config = config;
    this.map = generateMap(config);
  }

  addPlayer(): string {
    const id = uuidv4();
    const spawn = this._findSafeSpawnPoint();
    this.players[id] = {
      id,
      x: spawn.x,
      y: spawn.y,
      angle: 0,
      cannonAngle: 0,
      lives: this.config.maxLives,
      cooldown: 0,
      deadUntil: 0,
      mines: [],
      // Dimensions du tank
      bodyWidth: 60,
      bodyHeight: 40,
      turretRadius: 20,
      cannonLength: 40,
      cannonWidth: 8,
      trackWidth: 8,
      trackLength: 70
    };
    return id;
  }

  removePlayer(id: string) {
    delete this.players[id];
  }

  handleMessage(playerId: string, msg: any) {
    const player = this.players[playerId];
    if (!player || player.lives <= 0 || Date.now() < player.deadUntil) return;

    switch (msg.type) {
      case "move":
        if (typeof msg.forward === "number" && typeof msg.turn === "number") {
          const speed = this.config.tankSpeed || 2;
          const rotationSpeed = this.config.rotationSpeed || 0.05;
          
          // Déplacement avec glissement
          if (msg.forward !== 0) {
            const moveX = Math.cos(player.angle) * msg.forward * speed;
            const moveY = Math.sin(player.angle) * msg.forward * speed;
            
            const newX = player.x + moveX;
            const newY = player.y + moveY;
            
            // Check bounds (bordure dynamique selon le rayon du tank)
            const tankRadius = this.config.tankRadius || 30;
            const boundedX = Math.max(tankRadius, Math.min(this.config.mapWidth - tankRadius, newX));
            const boundedY = Math.max(tankRadius, Math.min(this.config.mapHeight - tankRadius, newY));
            
            // Try full movement first
            if (!this._checkObstacleCollision(boundedX, boundedY, 30)) {
              player.x = boundedX;
              player.y = boundedY;
            } else {
              // Try sliding along X axis
              if (!this._checkObstacleCollision(boundedX, player.y, 30)) {
                player.x = boundedX;
              }
              // Try sliding along Y axis
              else if (!this._checkObstacleCollision(player.x, boundedY, 30)) {
                player.y = boundedY;
              }
            }
          }
          
          // Rotation du tank
          if (msg.turn !== 0) {
            player.angle += msg.turn * rotationSpeed;
          }
          
          // Mise à jour de l'angle du canon (directement depuis la souris)
          if (typeof msg.cannonAngle === "number") {
            player.cannonAngle = msg.cannonAngle;
          }
        }
        break;
      case "cannonAim":
        if (typeof msg.angle === "number") {
          player.cannonAngle = msg.angle;
        }
        break;
      case "shoot":
        const bulletSpeed = this.config.bulletSpeed || 6;
        // Calculer la position du bout du canon
        const cannonTipX = player.x + Math.cos(player.cannonAngle) * player.cannonLength;
        const cannonTipY = player.y + Math.sin(player.cannonAngle) * player.cannonLength;
        
        const bullet: Bullet = {
          id: uuidv4(),
          x: cannonTipX,
          y: cannonTipY,
          vx: Math.cos(player.cannonAngle) * bulletSpeed,
          vy: Math.sin(player.cannonAngle) * bulletSpeed,
          owner: playerId
        };
        this.bullets.push(bullet);
        break;
      case "mine":
        if (player.mines.length < (this.config.maxMines || 2)) {
          const mine: Mine = {
            id: uuidv4(),
            x: player.x,
            y: player.y,
            placedAt: Date.now(),
            owner: playerId,
            exploded: false
          };
          this.mines.push(mine);
          player.mines.push(mine);
        }
        break;
      default:
        break;
    }
  }

  getState() {
    return {
      players: this.players,
      bullets: this.bullets,
      mines: this.mines,
      map: this.map
    };
  }

 // Boucle d'état : avance bullets, gère collisions, vies, respawn, cooldowns
 update() {
   const now = Date.now();

   // Avancer les bullets
   for (const bullet of this.bullets) {
     bullet.x += bullet.vx;
     bullet.y += bullet.vy;
   }

   // Remove bullets that are out of bounds or hit obstacles
   this.bullets = this.bullets.filter(
     (b) => {
       // Check bounds
       if (b.x < 0 || b.x > this.config.mapWidth || b.y < 0 || b.y > this.config.mapHeight) {
         return false;
       }
       // Check obstacle collision
       return !this._checkObstacleCollision(b.x, b.y, 6);
     }
   );

   // Collisions bullet/tank
   for (const bullet of this.bullets) {
     for (const id in this.players) {
       const player = this.players[id];
       if (
         bullet.owner !== id &&
         player.lives > 0 &&
         Date.now() >= player.deadUntil &&
         this._distance(bullet.x, bullet.y, player.x, player.y) < (this.config.tankRadius || 20)
       ) {
         player.lives -= 1;
         if (player.lives <= 0) {
           player.deadUntil = now + (this.config.respawnDelay || 3000);
           const spawn = this._findSafeSpawnPoint();
           player.x = spawn.x;
           player.y = spawn.y;
           player.lives = this.config.maxLives;
         }
         bullet.x = -9999; // Marquer pour suppression
       }
     }
   }
   // Nettoyer les bullets ayant touché
   this.bullets = this.bullets.filter((b) => b.x !== -9999);

   // Collisions mine/tank
   for (const mine of this.mines) {
     if (mine.exploded) continue;
     for (const id in this.players) {
       const player = this.players[id];
       if (
         mine.owner !== id &&
         player.lives > 0 &&
         Date.now() >= player.deadUntil &&
         this._distance(mine.x, mine.y, player.x, player.y) < (this.config.tankRadius || 20)
       ) {
         player.lives -= 1;
         mine.exploded = true;
         if (player.lives <= 0) {
           player.deadUntil = now + (this.config.respawnDelay || 3000);
           const spawn = this._findSafeSpawnPoint();
           player.x = spawn.x;
           player.y = spawn.y;
           player.lives = this.config.maxLives;
         }
       }
     }
   }
   // Nettoyer les mines explosées
   this.mines = this.mines.filter((m) => !m.exploded);

   // Gestion cooldowns
   for (const id in this.players) {
     const player = this.players[id];
     if (player.cooldown > 0) {
       player.cooldown -= 50;
       if (player.cooldown < 0) player.cooldown = 0;
     }
     // Nettoyer les mines du joueur qui n'existent plus
     player.mines = player.mines.filter((mine) =>
       this.mines.some((m) => m.id === mine.id)
     );
   }
 }

  startGameLoop() {
    this.gameLoopInterval = setInterval(() => {
      this.update();
    }, 50);
  }

  stopGameLoop() {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
  }

  private _distance(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
  }

  private _checkObstacleCollision(x: number, y: number, radius: number): boolean {
    // Optimisation : skip si pas d'obstacles
    if (this.map.length === 0) return false;
    
    for (const obstacle of this.map) {
      // Quick bounds check first
      const minX = obstacle.x - radius;
      const maxX = obstacle.x + obstacle.width + radius;
      const minY = obstacle.y - radius;
      const maxY = obstacle.y + obstacle.height + radius;
      
      if (x < minX || x > maxX || y < minY || y > maxY) {
        continue; // Skip detailed collision check
      }
      
      if (obstacle.type === "rect") {
        // Check rectangle collision
        if (x + radius > obstacle.x && 
            x - radius < obstacle.x + obstacle.width &&
            y + radius > obstacle.y && 
            y - radius < obstacle.y + obstacle.height) {
          return true;
        }
      } else if (obstacle.type === "circle") {
        // Check circle collision
        const obstacleRadius = obstacle.width / 2;
        const centerX = obstacle.x + obstacleRadius;
        const centerY = obstacle.y + obstacleRadius;
        const distSq = (x - centerX) ** 2 + (y - centerY) ** 2;
        const radiusSumSq = (radius + obstacleRadius) ** 2;
        if (distSq < radiusSumSq) {
          return true;
        }
      }
    }
    return false;
  }

  private _findSafeSpawnPoint(): { x: number, y: number } {
    const radius = this.config.tankRadius || 25;
    const margin = radius + 10;
    
    for (let attempts = 0; attempts < 50; attempts++) {
      const x = margin + Math.random() * (this.config.mapWidth - 2 * margin);
      const y = margin + Math.random() * (this.config.mapHeight - 2 * margin);
      
      if (!this._checkObstacleCollision(x, y, radius)) {
        // Also check that it's not too close to other players
        let tooClose = false;
        for (const playerId in this.players) {
          const other = this.players[playerId];
          if (other.lives > 0 && this._distance(x, y, other.x, other.y) < radius * 3) {
            tooClose = true;
            break;
          }
        }
        if (!tooClose) {
          return { x, y };
        }
      }
    }
    
    // Fallback to center if no safe spot found
    return { 
      x: this.config.mapWidth / 2, 
      y: this.config.mapHeight / 2 
    };
  }
}
