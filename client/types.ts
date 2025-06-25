// client/types.ts

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

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "rect" | "circle";
}

export interface GameConfig {
  tankSpeed: number;
  bulletSpeed: number;
  bulletDamage: number;
  maxLives: number;
  respawnCooldown: number;
  mineCooldown: number;
  mineExplosionDelay: number;
  mapWidth: number;
  mapHeight: number;
  obstacleCount: number;
}