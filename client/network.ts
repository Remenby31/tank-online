// client/network.ts

import type { Player, Bullet, Mine, Obstacle, GameConfig } from "./types";

export interface InitMessage {
  type: "init";
  playerId: string;
  config: GameConfig;
  map: Obstacle[];
}

export interface StateMessage {
  type: "state";
  state: {
    players: Record<string, Player>;
    bullets: Bullet[];
    mines: Mine[];
    map: Obstacle[];
  };
}

export type ServerMessage = InitMessage | StateMessage;

export class Network {
  ws: WebSocket;
  onInit: (msg: InitMessage) => void = () => {};
  onState: (msg: StateMessage) => void = () => {};
  private messageQueue: any[] = [];
  private isConnected = false;

  constructor() {
    const port = location.port || '8080';
    this.ws = new WebSocket(`ws://${location.hostname}:${port}`);
    
    this.ws.onopen = () => {
      console.log('Connected to game server');
      this.isConnected = true;
      // Send any queued messages
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        this.ws.send(JSON.stringify(message));
      }
    };
    
    this.ws.onmessage = (event) => {
      const msg: ServerMessage = JSON.parse(event.data);
      if (msg.type === "init") this.onInit(msg);
      if (msg.type === "state") this.onState(msg);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.ws.onclose = () => {
      console.log('Disconnected from game server');
      this.isConnected = false;
    };
  }

  send(data: any) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      // Queue the message until connection is ready
      this.messageQueue.push(data);
      console.log('Message queued, WebSocket not ready yet');
    }
  }
}