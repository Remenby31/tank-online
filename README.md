# Tank Online – Jeu multijoueur TypeScript

## Présentation

Jeu de tanks multijoueur inspiré de Wii Play, développé en TypeScript. Chaque joueur contrôle un tank, le canon suit la souris, tir à la souris, pose de mines, gestion des vies, cooldown à la mort, map générée aléatoirement. Toutes les variables sont modifiables via un fichier JSON.

---

## Architecture

```mermaid
flowchart TD
    subgraph Client (Navigateur)
        A1[Canvas rendering]
        A2[Contrôles joueur (souris, clavier)]
        A3[Gestion tank local]
        A4[Connexion WebSocket]
        A5[Affichage UI (vies, cooldown, etc.)]
    end
    subgraph Serveur (Node.js)
        B1[WebSocket Server]
        B2[Gestion état global]
        B3[Synchronisation joueurs]
        B4[Génération map aléatoire]
        B5[Gestion collisions & règles]
        B6[Variables dynamiques (JSON)]
    end
    A4 <--> B1
    B4 --> B2
    B6 --> B2
```

---

## Fonctionnalités

- Connexion multijoueur (WebSocket)
- Contrôle du tank (clavier + souris)
- Canon qui suit la souris
- Tir à la souris (bullet)
- Vies (max 3, configurable)
- Cooldown à la mort, respawn automatique
- Pose de mines (explosion après 3 minutes)
- Variables dynamiques dans `config.json`
- Génération de maps aléatoires avec obstacles
- Synchronisation serveur (anti-triche)

---

## Structure technique

### Serveur Node.js (TypeScript)
- `server.ts` : serveur WebSocket, gestion des connexions, synchronisation état.
- `gameState.ts` : logique du jeu (positions, collisions, vies, mines, etc.).
- `mapGenerator.ts` : génération procédurale de la map.
- `config.json` : toutes les variables du jeu.

### Client (TypeScript)
- `index.html` : page principale.
- `main.ts` : logique client, rendu canvas, gestion entrées.
- `network.ts` : communication WebSocket.
- `ui.ts` : affichage des infos (vies, cooldown, etc.).
- `types.ts` : types partagés (tank, bullet, mine, etc.).

---

## Exemple de config.json

```json
{
  "tankSpeed": 2.5,
  "bulletSpeed": 6,
  "bulletDamage": 1,
  "maxLives": 3,
  "respawnCooldown": 5,
  "mineCooldown": 10,
  "mineExplosionDelay": 180,
  "mapWidth": 1200,
  "mapHeight": 800,
  "obstacleCount": 15
}
```

---

## Synchronisation & logique

- Le serveur valide toutes les actions (tir, pose de mine, collisions).
- Le client envoie ses intentions (déplacement, tir, pose mine).
- Le serveur renvoie l’état global à tous les clients à intervalle régulier.
- Les obstacles et la map sont générés côté serveur et envoyés à chaque client à la connexion.

---

## Génération de map

- Obstacles rectangulaires ou circulaires, placés aléatoirement sans bloquer les spawns.
- Les positions sont envoyées à tous les clients au début de la partie.

---

## Sécurité & anti-triche

- Toutes les collisions et dégâts sont validés côté serveur.
- Les clients ne peuvent pas modifier leur état local sans validation serveur.

---

## 🚀 Quick Start

1. Installer les dépendances serveur :  
   `npm install`
2. Lancer le serveur :  
   `npm run start`
3. Ouvrir le client dans un navigateur.

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager

### Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Quick development mode (recommended):**
   
   **Single terminal - Start everything:**
   ```bash
   npm run dev
   ```
   
   This will start the server auto-rebuild, game server, and client dev server.
   Then open http://localhost:5173 in your browser

3. **Manual development mode (if you prefer separate terminals):**
   
   **Terminal 1 - Start the game server:**
   ```bash
   npm run build:server
   npm run start:server
   ```
   
   **Terminal 2 - Start the client dev server:**
   ```bash
   npm run dev:client
   ```
   
   Then open http://localhost:5173 in your browser

### Production Setup

1. **Build and start production server:**
   ```bash
   npm run build
   npm start
   ```
   
   Then open http://localhost:8080 in your browser

### Alternative Development Workflow

**Auto-rebuild server on changes:**
```bash
# Terminal 1 - Auto-rebuild server
npm run dev:server

# Terminal 2 - Start server (restart manually when server changes)
npm run start:server

# Terminal 3 - Client dev server
npm run dev:client
```

## 🎮 How to Play

- **Move:** WASD or Arrow Keys
- **Aim:** Mouse cursor
- **Shoot:** Left click
- **Place Mine:** Spacebar
- **Objective:** Eliminate other players while staying alive!

---