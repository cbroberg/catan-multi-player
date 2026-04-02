import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@catan/shared';
import { GameManager } from './game-manager';
import { buildGameView } from './game-view-builder';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketHandlers(io: TypedServer, gm: GameManager) {
  io.on('connection', (socket: TypedSocket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ─── Lobby Events ──────────────────────────────────────────────────

    socket.on('game:create', (config, callback) => {
      const result = gm.createGame(config);
      socket.join(gm.getGameRoom(result.gameId));
      callback({ gameId: result.gameId, code: result.code });
    });

    socket.on('game:join', (data, callback) => {
      const result = gm.joinGame(data.code, data.name, data.color, data.avatar, socket.id);
      if ('error' in result) { callback({ error: result.error }); return; }

      const room = gm.getGameRoom(result.gameId);
      socket.join(room);
      io.to(room).emit('lobby:state', result.lobby);
      callback({ gameId: result.gameId, playerId: result.playerId });
    });

    socket.on('game:observe', (gameId, callback) => {
      const lobby = gm.addObserver(gameId, socket.id);
      if (!lobby) { callback({ error: 'Game not found' }); return; }
      socket.join(gm.getGameRoom(gameId));
      callback({ lobby });

      // If game is already started, send game view
      const engine = gm.getEngine(gameId);
      if (engine) {
        socket.emit('game:view', buildGameView(engine, gameId, null));
      }
    });

    socket.on('player:ready', (gameId) => {
      const lobby = gm.toggleReady(gameId, socket.id);
      if (lobby) io.to(gm.getGameRoom(gameId)).emit('lobby:state', lobby);
    });

    socket.on('player:color', ({ gameId, color }) => {
      const lobby = gm.changeColor(gameId, socket.id, color);
      if (lobby) io.to(gm.getGameRoom(gameId)).emit('lobby:state', lobby);
    });

    socket.on('game:regenerate-board', (gameId) => {
      const result = gm.regenerateBoard(gameId);
      if (result) io.to(gm.getGameRoom(gameId)).emit('lobby:board-updated', result);
    });

    socket.on('game:start', (gameId, callback) => {
      const result = gm.startGame(gameId, socket.id);
      if ('error' in result) { callback({ error: result.error }); return; }
      callback({ success: true });
      io.to(gm.getGameRoom(gameId)).emit('game:starting', { gameId, turnOrder: result.turnOrder });

      // Send initial game view to all players
      broadcastGameView(io, gm, gameId);
    });

    socket.on('game:leave', (gameId) => {
      const result = gm.removePlayer(socket.id);
      if (result) {
        socket.leave(gm.getGameRoom(gameId));
        io.to(gm.getGameRoom(result.gameId)).emit('lobby:state', result.lobby);
      }
    });

    // ─── Game Action Events ────────────────────────────────────────────

    socket.on('game:request-view', (gameId) => {
      const engine = gm.getEngine(gameId);
      if (!engine) return;
      const mapping = gm.getPlayerIdForSocket(socket.id);
      socket.emit('game:view', buildGameView(engine, gameId, mapping?.playerId ?? null));
    });

    socket.on('action:roll-dice', (gameId) => {
      const r = withEngine(gm, socket, gameId, (engine, playerId) => {
        const result = engine.rollDice(playerId);
        if (!result.ok) return result.error;
        if (result.dice) {
          io.to(gm.getGameRoom(gameId)).emit('game:dice-result', {
            d1: result.dice[0], d2: result.dice[1], total: result.dice[0] + result.dice[1],
          });
        }
        return null;
      });
      if (r) socket.emit('game:action-error', r);
      else broadcastGameView(io, gm, gameId);
    });

    socket.on('action:build-settlement', (gameId, vertexId) => {
      runAction(io, gm, socket, gameId, (engine, pid) => engine.buildSettlement(pid, vertexId));
    });

    socket.on('action:build-city', (gameId, vertexId) => {
      runAction(io, gm, socket, gameId, (engine, pid) => engine.buildCity(pid, vertexId));
    });

    socket.on('action:build-road', (gameId, edgeId) => {
      runAction(io, gm, socket, gameId, (engine, pid) => engine.buildRoad(pid, edgeId));
    });

    socket.on('action:buy-dev-card', (gameId) => {
      runAction(io, gm, socket, gameId, (engine, pid) => engine.buyDevCard(pid));
    });

    socket.on('action:play-knight', (gameId, hexCoord, stealFromId) => {
      runAction(io, gm, socket, gameId, (engine, pid) => engine.playKnight(pid, hexCoord, stealFromId));
    });

    socket.on('action:play-monopoly', (gameId, resource) => {
      runAction(io, gm, socket, gameId, (engine, pid) => engine.playMonopoly(pid, resource));
    });

    socket.on('action:play-year-of-plenty', (gameId, res1, res2) => {
      runAction(io, gm, socket, gameId, (engine, pid) => engine.playYearOfPlenty(pid, res1, res2));
    });

    socket.on('action:play-road-building', (gameId, edge1, edge2) => {
      runAction(io, gm, socket, gameId, (engine, pid) => engine.playRoadBuilding(pid, edge1, edge2));
    });

    socket.on('action:maritime-trade', (gameId, give, receive) => {
      runAction(io, gm, socket, gameId, (engine, pid) => engine.maritimeTrade(pid, give, receive));
    });

    socket.on('action:move-robber', (gameId, hexCoord, stealFromId) => {
      runAction(io, gm, socket, gameId, (engine, pid) => engine.moveRobber(pid, hexCoord, stealFromId));
    });

    socket.on('action:discard', (gameId, cards) => {
      const mapping = gm.getPlayerIdForSocket(socket.id);
      if (!mapping) { socket.emit('game:action-error', 'Not in game'); return; }
      const engine = gm.getEngine(gameId);
      if (!engine) { socket.emit('game:action-error', 'Game not found'); return; }
      const result = engine.discardCards(mapping.playerId, cards);
      if (!result.ok) { socket.emit('game:action-error', result.error ?? 'Failed'); return; }
      broadcastGameView(io, gm, gameId);
    });

    socket.on('action:end-turn', (gameId) => {
      runAction(io, gm, socket, gameId, (engine, pid) => engine.endTurn(pid));
    });

    // ─── Disconnect ────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      const result = gm.removePlayer(socket.id);
      if (result) io.to(gm.getGameRoom(result.gameId)).emit('lobby:state', result.lobby);
      gm.removeObserver(socket.id);
    });
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function withEngine(
  gm: GameManager,
  socket: TypedSocket,
  gameId: string,
  fn: (engine: import('@catan/game-engine').GameEngine, playerId: string) => string | null
): string | null {
  const mapping = gm.getPlayerIdForSocket(socket.id);
  if (!mapping) return 'Not in game';
  const engine = gm.getEngine(gameId);
  if (!engine) return 'Game not found';
  return fn(engine, mapping.playerId);
}

function runAction(
  io: TypedServer,
  gm: GameManager,
  socket: TypedSocket,
  gameId: string,
  fn: (engine: import('@catan/game-engine').GameEngine, playerId: string) => { ok: boolean; error?: string }
) {
  const error = withEngine(gm, socket, gameId, (engine, playerId) => {
    const result = fn(engine, playerId);
    return result.ok ? null : (result.error ?? 'Action failed');
  });
  if (error) socket.emit('game:action-error', error);
  else broadcastGameView(io, gm, gameId);
}

/**
 * Send personalized game views to each player (private hand info differs).
 * Observers get a view with no private data.
 */
function broadcastGameView(io: TypedServer, gm: GameManager, gameId: string) {
  const engine = gm.getEngine(gameId);
  if (!engine) return;

  const room = gm.getGameRoom(gameId);
  const sockets = io.sockets.adapter.rooms.get(room);
  if (!sockets) return;

  for (const socketId of sockets) {
    const s = io.sockets.sockets.get(socketId);
    if (!s) continue;
    const mapping = gm.getPlayerIdForSocket(socketId);
    const view = buildGameView(engine, gameId, mapping?.playerId ?? null);
    s.emit('game:view', view);
  }
}
