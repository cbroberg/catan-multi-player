import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@catan/shared';
import { GameManager } from './game-manager';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketHandlers(io: TypedServer, gm: GameManager) {
  io.on('connection', (socket: TypedSocket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on('game:create', (config, callback) => {
      const result = gm.createGame(config);
      socket.join(gm.getGameRoom(result.gameId));
      callback({ gameId: result.gameId, code: result.code });
    });

    socket.on('game:join', (data, callback) => {
      const result = gm.joinGame(data.code, data.name, data.color, data.avatar, socket.id);
      if ('error' in result) {
        callback({ error: result.error });
        return;
      }

      const room = gm.getGameRoom(result.gameId);
      socket.join(room);

      // Notify all in room
      io.to(room).emit('lobby:state', result.lobby);
      callback({ gameId: result.gameId, playerId: result.playerId });
    });

    socket.on('game:observe', (gameId, callback) => {
      const lobby = gm.addObserver(gameId, socket.id);
      if (!lobby) {
        callback({ error: 'Game not found' });
        return;
      }
      socket.join(gm.getGameRoom(gameId));
      callback({ lobby });
    });

    socket.on('player:ready', (gameId) => {
      const lobby = gm.toggleReady(gameId, socket.id);
      if (lobby) {
        io.to(gm.getGameRoom(gameId)).emit('lobby:state', lobby);
      }
    });

    socket.on('player:color', ({ gameId, color }) => {
      const lobby = gm.changeColor(gameId, socket.id, color);
      if (lobby) {
        io.to(gm.getGameRoom(gameId)).emit('lobby:state', lobby);
      }
    });

    socket.on('game:regenerate-board', (gameId) => {
      const result = gm.regenerateBoard(gameId);
      if (result) {
        io.to(gm.getGameRoom(gameId)).emit('lobby:board-updated', result);
      }
    });

    socket.on('game:start', (gameId, callback) => {
      const result = gm.startGame(gameId, socket.id);
      if ('error' in result) {
        callback({ error: result.error });
        return;
      }
      callback({ success: true });
      io.to(gm.getGameRoom(gameId)).emit('game:starting', {
        gameId,
        turnOrder: result.turnOrder,
      });
    });

    socket.on('game:leave', (gameId) => {
      const result = gm.removePlayer(socket.id);
      if (result) {
        socket.leave(gm.getGameRoom(gameId));
        io.to(gm.getGameRoom(result.gameId)).emit('lobby:state', result.lobby);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      const result = gm.removePlayer(socket.id);
      if (result) {
        io.to(gm.getGameRoom(result.gameId)).emit('lobby:state', result.lobby);
      }
      gm.removeObserver(socket.id);
    });
  });
}
