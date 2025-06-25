"use strict";
// client/network.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.Network = void 0;
class Network {
    constructor() {
        this.onInit = () => { };
        this.onState = () => { };
        this.messageQueue = [];
        this.isConnected = false;
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
            const msg = JSON.parse(event.data);
            if (msg.type === "init")
                this.onInit(msg);
            if (msg.type === "state")
                this.onState(msg);
        };
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        this.ws.onclose = () => {
            console.log('Disconnected from game server');
            this.isConnected = false;
        };
    }
    send(data) {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
        else {
            // Queue the message until connection is ready
            this.messageQueue.push(data);
            console.log('Message queued, WebSocket not ready yet');
        }
    }
}
exports.Network = Network;
