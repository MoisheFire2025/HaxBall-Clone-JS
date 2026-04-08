import { Peer, DataConnection } from 'peerjs';

export type MessageType = 'INPUT' | 'STATE' | 'JOIN' | 'WELCOME';

export interface NetworkMessage {
  type: MessageType;
  payload: any;
}

export class NetworkManager {
  peer: Peer;
  connections: DataConnection[] = [];
  onMessage: (conn: DataConnection, msg: NetworkMessage) => void;
  onConnect: (conn: DataConnection) => void;
  onDisconnect: (conn: DataConnection) => void;

  constructor(
    onMessage: (conn: DataConnection, msg: NetworkMessage) => void,
    onConnect: (conn: DataConnection) => void,
    onDisconnect: (conn: DataConnection) => void
  ) {
    this.peer = new Peer();
    this.onMessage = onMessage;
    this.onConnect = onConnect;
    this.onDisconnect = onDisconnect;

    this.peer.on('connection', (conn) => {
      this.setupConnection(conn);
    });
  }

  setupConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.push(conn);
      this.onConnect(conn);
    });

    conn.on('data', (data) => {
      this.onMessage(conn, data as NetworkMessage);
    });

    conn.on('close', () => {
      this.connections = this.connections.filter(c => c.peer !== conn.peer);
      this.onDisconnect(conn);
    });

    conn.on('error', () => {
      this.connections = this.connections.filter(c => c.peer !== conn.peer);
      this.onDisconnect(conn);
    });
  }

  connect(hostId: string) {
    const conn = this.peer.connect(hostId);
    this.setupConnection(conn);
    return conn;
  }

  broadcast(msg: NetworkMessage) {
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send(msg);
      }
    });
  }

  send(conn: DataConnection, msg: NetworkMessage) {
    if (conn.open) {
      conn.send(msg);
    }
  }
}
