import { IncomingMessage } from 'http';
import * as WebSocket from 'ws';

import { IPlayer } from 'src/IPlayer';

interface IPlayerSocket {
    name?: string;
    socket: WebSocket;
}

interface ICallbacks {
    onBuzz(player: IPlayer);
}

class PlayerSocketServer {
    private _clientMap: Map<string, IPlayerSocket>;
    private _isActive: boolean;
    private _socketServer: WebSocket.Server;

    constructor(private _callbacks: ICallbacks) {
        this._clientMap = new Map();
        this._isActive = false;
    }

    public startServer(server, port: number) {
        if (this._socketServer) {
            return;
        }

        this._socketServer = new WebSocket.Server({ server, port });
        this._socketServer.on('connection', (ws, req) => this._onConnect(ws, req));
    }

    public startQuestion() {
        this._broadcast({type: 'start'});
        this._isActive = true;
    }

    public stopQuestion() {
        this._broadcast({type: 'stop'});
        this._isActive = false;
    }

    private _onConnect(ws: WebSocket, req: IncomingMessage) {
        const ip = req.connection.remoteAddress; // if NGINX req.headers['x-forwarded-for'];

        this._clientMap.set(ip, { socket: ws });

        ws.on('close', () => this._clientMap.delete(ip));

        ws.on('message', (data) => this._onMessage(data, ip));
    }

    private _onMessage(data, id: string) {
        const parsedData = JSON.parse(data);
        const client = this._clientMap.get(id);

        switch (parsedData.type) {
            case 'BUZZ':
                this._callbacks.onBuzz({ name: client.name });
                break;
            case 'NAME':
                client.name = parsedData.name;
                break;
        }
    }

    private _broadcast(message) {
        for (const client of this._clientMap.values()) {
            client.socket.send(JSON.stringify(message));
        }
    }
}

export {
    PlayerSocketServer,
};
