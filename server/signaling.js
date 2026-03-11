/**
 * Sign Call — WebSocket Signaling Server
 *
 * A minimal, self-contained WebRTC signaling relay for Sign Call.
 * It is intentionally simple: no auth, no persistence, pure in-memory
 * room management. Add your own auth layer before exposing publicly.
 *
 * ── Protocol ─────────────────────────────────────────────────────────────────
 *
 * Clients connect with query params:
 *   ws://<host>/ws?roomId=ABC-123&peerId=<uuid>&userName=Alice
 *
 * Inbound message types (client → server):
 *   { type: 'join',          roomId, peerId, payload: userName }
 *   { type: 'offer',         roomId, peerId, targetId, payload: RTCSessionDescription }
 *   { type: 'answer',        roomId, peerId, targetId, payload: RTCSessionDescription }
 *   { type: 'ice-candidate', roomId, peerId, targetId, payload: RTCIceCandidate }
 *   { type: 'leave',         roomId, peerId }
 *
 * Outbound message types (server → client):
 *   { type: 'peer-joined', roomId, peerId, payload: userName }   → all others in room
 *   { type: 'peer-left',   roomId, peerId }                      → all others in room
 *   { type: 'offer' | 'answer' | 'ice-candidate', ... }         → targetId only
 *
 * ── Running ───────────────────────────────────────────────────────────────────
 *
 *   node server/signaling.js [port]          # default port: 8080
 *   PORT=443 node server/signaling.js        # via env var
 *
 * For production:
 *   - Run behind a TLS-terminating reverse proxy (nginx, Caddy, etc.)
 *   - Clients connect with wss:// after TLS termination
 *   - Or use a PaaS that auto-provides TLS (Railway, Render, Fly.io, etc.)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const http = require('http');
const { WebSocketServer, OPEN } = require('ws');
const { URL }  = require('url');

// ── Configuration ─────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || process.argv[2] || '8080', 10);
const MAX_PEERS_PER_ROOM = parseInt(process.env.MAX_PEERS || '10', 10);
const HEARTBEAT_INTERVAL_MS = 30_000;
const CLIENT_TIMEOUT_MS = 60_000;

// ── In-memory room registry ───────────────────────────────────────────────────

/**
 * rooms: Map<roomId, Map<peerId, { ws, userName, joinedAt }>>
 */
const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  return rooms.get(roomId);
}

function cleanupPeer(roomId, peerId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.delete(peerId);
  if (room.size === 0) rooms.delete(roomId);
}

// ── Message helpers ───────────────────────────────────────────────────────────

function send(ws, message) {
  if (ws.readyState === OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcastToRoom(roomId, excludePeerId, message) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const [peerId, peer] of room.entries()) {
    if (peerId !== excludePeerId) {
      send(peer.ws, message);
    }
  }
}

function sendToPeer(roomId, targetId, message) {
  const room = rooms.get(roomId);
  if (!room) return;
  const target = room.get(targetId);
  if (target) send(target.ws, message);
}

// ── Message handler ───────────────────────────────────────────────────────────

function handleMessage(ws, rawData, peerId, roomId) {
  let message;
  try {
    message = JSON.parse(rawData.toString());
  } catch {
    console.warn('[signaling] Bad JSON from peer', peerId);
    return;
  }

  const { type, payload, targetId } = message;

  switch (type) {
    case 'join': {
      const room = getOrCreateRoom(roomId);
      if (room.size >= MAX_PEERS_PER_ROOM) {
        send(ws, { type: 'error', payload: 'Room is full' });
        ws.close();
        return;
      }

      const userName = typeof payload === 'string' ? payload : String(peerId);
      room.set(peerId, { ws, userName, joinedAt: Date.now() });

      // Notify existing peers that a new peer joined
      broadcastToRoom(roomId, peerId, {
        type: 'peer-joined',
        roomId,
        peerId,
        payload: userName,
      });

      // Tell the joiner about all existing peers
      for (const [existingId, existingPeer] of room.entries()) {
        if (existingId !== peerId) {
          send(ws, {
            type: 'peer-joined',
            roomId,
            peerId: existingId,
            payload: existingPeer.userName,
          });
        }
      }

      console.log(`[signaling] ${userName} (${peerId}) joined room ${roomId} (${room.size} peers)`);
      break;
    }

    case 'offer':
    case 'answer':
    case 'ice-candidate': {
      if (!targetId) {
        console.warn('[signaling] Missing targetId for', type);
        return;
      }
      sendToPeer(roomId, targetId, { type, roomId, peerId, targetId, payload });
      break;
    }

    case 'leave':
      handleLeave(roomId, peerId);
      break;

    default:
      console.warn('[signaling] Unknown message type:', type);
  }
}

function handleLeave(roomId, peerId) {
  const room = rooms.get(roomId);
  if (!room || !room.has(peerId)) return;

  const peer = room.get(peerId);
  const userName = peer ? peer.userName : peerId;
  cleanupPeer(roomId, peerId);
  broadcastToRoom(roomId, peerId, { type: 'peer-left', roomId, peerId });
  console.log(`[signaling] ${userName} (${peerId}) left room ${roomId}`);
}

// ── HTTP + WebSocket server ───────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      rooms: rooms.size,
      peers: [...rooms.values()].reduce((n, r) => n + r.size, 0),
      uptime: Math.floor(process.uptime()),
    }));
    return;
  }
  res.writeHead(404);
  res.end('Sign Call Signaling Server\n');
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  // Parse peerId / roomId from query string
  let roomId, peerId;
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    roomId  = url.searchParams.get('roomId')  || '';
    peerId  = url.searchParams.get('peerId')  || `anon-${Date.now()}`;
  } catch {
    ws.close();
    return;
  }

  if (!roomId) {
    ws.close();
    return;
  }

  // Heartbeat to detect dead connections
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data) => {
    handleMessage(ws, data, peerId, roomId);
  });

  ws.on('close', () => {
    handleLeave(roomId, peerId);
  });

  ws.on('error', (err) => {
    console.warn('[signaling] WebSocket error for peer', peerId, ':', err.message);
    handleLeave(roomId, peerId);
  });
});

// Ping all clients periodically to detect stale connections
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL_MS);

wss.on('close', () => clearInterval(heartbeatInterval));

// ── Start ─────────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`[signaling] Sign Call signaling server listening on ws://0.0.0.0:${PORT}/ws`);
  console.log(`[signaling] Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`[signaling] Max peers per room: ${MAX_PEERS_PER_ROOM}`);
});

server.on('error', (err) => {
  console.error('[signaling] Server error:', err.message);
  process.exit(1);
});

// Graceful shutdown
function shutdown() {
  console.log('[signaling] Shutting down…');
  clearInterval(heartbeatInterval);
  wss.close(() => {
    server.close(() => process.exit(0));
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);
