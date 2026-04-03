import { createServer } from 'node:http';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@catan/shared';
import { GameManager } from './server/game-manager';
import { registerSocketHandlers } from './server/socket-handler';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3030', 10);

const hostname = '0.0.0.0';
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: dev ? '*' : undefined,
    },
    path: '/api/socket',
  });

  const gameManager = new GameManager();
  registerSocketHandlers(io, gameManager);

  httpServer.listen(port, hostname, () => {
    console.log(`> Catan server ready on http://localhost:${port}`);
    console.log(`> Socket.IO path: /api/socket`);
    console.log(`> Environment: ${dev ? 'development' : 'production'}`);
  });
});
