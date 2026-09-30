const jwt = require('jsonwebtoken');
const { User } = require('../models');

const DUEL_DURATION_MS = 60_000;

/** @type {Map<string, { ready: Set<number>, active: boolean, endsAt: number|null, timer: NodeJS.Timeout|null, scores: Map<number, number> }>} */
const roomState = new Map();

/** @type {Map<string, { hostSocketId: string, hostPublicId: number, hostUser: object, createdAt: number }>} */
const codeRooms = new Map();

/** @type {Map<string, { playerA: object, playerB: object, startedAt: number }>} */
const activeRoomsMeta = new Map();

/** observers: roomId -> Set of socketIds watching */
const observers = new Map();

function duelRoomId(publicIdA, publicIdB) {
  const ids = [Number(publicIdA), Number(publicIdB)].sort((a, b) => a - b);
  return `duel:${ids[0]}:${ids[1]}`;
}

function userRoom(publicId) {
  return `user:${publicId}`;
}

function duelParticipants(roomId) {
  const parts = roomId.split(':');
  return [Number(parts[1]), Number(parts[2])];
}

function getRoomState(roomId) {
  if (!roomState.has(roomId)) {
    roomState.set(roomId, {
      ready: new Set(),
      active: false,
      endsAt: null,
      timer: null,
      scores: new Map(),
    });
  }
  return roomState.get(roomId);
}

function clearRoomTimer(state) {
  if (state?.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
}

function readyPayload(roomId, publicId) {
  const state = getRoomState(roomId);
  const readyIds = [...state.ready];
  return {
    readyIds,
    selfReady: state.ready.has(publicId),
    peerReady: readyIds.some((id) => id !== publicId),
    active: state.active,
    endsAt: state.endsAt,
    durationSec: 60,
  };
}

function emitReadyUpdate(io, roomId) {
  const state = getRoomState(roomId);
  io.to(roomId).emit('duel:ready-update', {
    readyIds: [...state.ready],
    active: state.active,
    endsAt: state.endsAt,
  });
}

function endDuel(io, roomId) {
  const state = roomState.get(roomId);
  if (!state || !state.active) return;

  state.active = false;
  clearRoomTimer(state);

  const [idA, idB] = duelParticipants(roomId);
  const scoreA = state.scores.get(idA) ?? 0;
  const scoreB = state.scores.get(idB) ?? 0;

  let winnerPublicId = null;
  if (scoreA > scoreB) winnerPublicId = idA;
  else if (scoreB > scoreA) winnerPublicId = idB;

  io.to(roomId).emit('duel:ended', {
    scores: { [idA]: scoreA, [idB]: scoreB },
    winnerPublicId,
    tie: winnerPublicId == null,
    durationSec: 60,
  });

  state.ready.clear();
  state.endsAt = null;
  state.scores.clear();
}

function startDuel(io, roomId) {
  const state = getRoomState(roomId);
  if (state.active) return;

  state.active = true;
  state.scores.clear();
  state.endsAt = Date.now() + DUEL_DURATION_MS;
  clearRoomTimer(state);

  // Store meta for room listing
  const [idA, idB] = duelParticipants(roomId);
  const existing = activeRoomsMeta.get(roomId) || {};
  activeRoomsMeta.set(roomId, { ...existing, startedAt: state.endsAt - DUEL_DURATION_MS });

  io.to(roomId).emit('duel:started', {
    endsAt: state.endsAt,
    durationSec: 60,
  });

  state.timer = setTimeout(() => endDuel(io, roomId), DUEL_DURATION_MS);
}

function resetRoomOnEmpty(roomId) {
  const state = roomState.get(roomId);
  if (!state) return;
  clearRoomTimer(state);
  roomState.delete(roomId);
  activeRoomsMeta.delete(roomId);
  observers.delete(roomId);
}

/** Remove stale code rooms older than 10 minutes */
function pruneCodeRooms() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [code, entry] of codeRooms) {
    if (entry.createdAt < cutoff) codeRooms.delete(code);
  }
}

function generateRoomCode() {
  pruneCodeRooms();
  let code;
  do {
    code = String(Math.floor(100000 + Math.random() * 900000));
  } while (codeRooms.has(code));
  return code;
}

/** Returns list of active (started) duel rooms for the room browser */
function getActiveRooms() {
  const result = [];
  for (const [roomId, meta] of activeRoomsMeta) {
    const state = roomState.get(roomId);
    if (!state || !state.active) continue;
    result.push({
      roomId,
      playerA: meta.playerA || null,
      playerB: meta.playerB || null,
      startedAt: meta.startedAt,
      endsAt: state.endsAt,
      scores: Object.fromEntries(state.scores),
      observerCount: observers.get(roomId)?.size ?? 0,
    });
  }
  return result;
}

function attachDuelSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload.typ && payload.typ !== 'user') {
        return next(new Error('User token required'));
      }
      const user = await User.findByPk(payload.id);
      if (!user || !user.isActive || !user.publicId) {
        return next(new Error('Invalid user'));
      }
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const me = socket.user;
    let activeRoom = null;

    socket.join(userRoom(me.publicId));

    const peerPayload = () => ({
      publicId: me.publicId,
      displayName: me.displayName || 'Хэрэглэгч',
      photoUrl: me.photoUrl,
      todayPushUps: me.todayPushUps || 0,
    });

    const leaveActiveRoom = () => {
      if (!activeRoom) return;
      const roomId = activeRoom;
      const state = roomState.get(roomId);
      if (state) {
        state.ready.delete(me.publicId);
      }
      socket.to(roomId).emit('duel:peer-left', { publicId: me.publicId });
      socket.leave(roomId);
      activeRoom = null;

      const peersRemaining = io.sockets.adapter.rooms.get(roomId)?.size ?? 0;
      if (state?.active && peersRemaining < 2) {
        endDuel(io, roomId);
      } else if (state && !state.active) {
        emitReadyUpdate(io, roomId);
      }
    };

    const joinDuelRoom = (opponentId) => {
      const roomId = duelRoomId(me.publicId, opponentId);
      if (activeRoom && activeRoom !== roomId) {
        leaveActiveRoom();
      }
      activeRoom = roomId;
      socket.join(roomId);

      const peers = [...io.sockets.adapter.rooms.get(roomId) || []]
        .filter((sid) => sid !== socket.id);
      const peerPresent = peers.length > 0;

      // Track meta for room list
      const existingMeta = activeRoomsMeta.get(roomId) || {};
      if (me.publicId < opponentId) {
        existingMeta.playerA = peerPayload();
      } else {
        existingMeta.playerB = peerPayload();
      }
      activeRoomsMeta.set(roomId, existingMeta);

      socket.emit('duel:joined', {
        roomId,
        opponentPublicId: opponentId,
        isCaller: me.publicId < opponentId,
        peerPresent,
        ...readyPayload(roomId, me.publicId),
      });

      socket.to(roomId).emit('duel:peer-joined', peerPayload());
      return { roomId, peerPresent };
    };

    socket.on('duel:invite', ({ opponentPublicId }) => {
      const opponentId = Number(opponentPublicId);
      if (!Number.isFinite(opponentId) || opponentId <= 0 || opponentId === me.publicId) {
        socket.emit('duel:error', { message: 'Буруу ID' });
        return;
      }

      const targetRoom = userRoom(opponentId);
      const online = (io.sockets.adapter.rooms.get(targetRoom)?.size ?? 0) > 0;

      if (!online) {
        socket.emit('duel:invite-result', { ok: false, reason: 'offline' });
        return;
      }

      io.to(targetRoom).emit('duel:invite', { from: peerPayload() });
      socket.emit('duel:invite-result', { ok: true, opponentPublicId: opponentId });
    });

    socket.on('duel:accept', ({ inviterPublicId }) => {
      const inviterId = Number(inviterPublicId);
      if (!Number.isFinite(inviterId) || inviterId <= 0 || inviterId === me.publicId) {
        socket.emit('duel:error', { message: 'Буруу ID' });
        return;
      }

      joinDuelRoom(inviterId);
      io.to(userRoom(inviterId)).emit('duel:accepted', peerPayload());
    });

    socket.on('duel:decline', ({ inviterPublicId }) => {
      const inviterId = Number(inviterPublicId);
      if (!Number.isFinite(inviterId) || inviterId <= 0) return;
      io.to(userRoom(inviterId)).emit('duel:declined', { publicId: me.publicId });
    });

    socket.on('duel:join', ({ opponentPublicId }) => {
      const opponentId = Number(opponentPublicId);
      if (!Number.isFinite(opponentId) || opponentId <= 0 || opponentId === me.publicId) {
        socket.emit('duel:error', { message: 'Буруу ID' });
        return;
      }
      joinDuelRoom(opponentId);
    });

    socket.on('duel:ready', () => {
      if (!activeRoom) return;
      const state = getRoomState(activeRoom);
      if (state.active) return;

      state.ready.add(me.publicId);
      emitReadyUpdate(io, activeRoom);

      const [idA, idB] = duelParticipants(activeRoom);
      if (state.ready.has(idA) && state.ready.has(idB)) {
        startDuel(io, activeRoom);
      }
    });

    const relay = (event) => {
      socket.on(event, (payload) => {
        if (!activeRoom) return;
        socket.to(activeRoom).emit(event, payload);
      });
    };

    relay('duel:offer');
    relay('duel:answer');
    relay('duel:ice');

    socket.on('duel:frame', (payload) => {
      if (!activeRoom) return;
      let relay = payload;
      if (Buffer.isBuffer(payload)) {
        relay = { jpeg: payload };
      } else if (Array.isArray(payload)) {
        relay = { jpeg: payload };
      } else if (payload?.jpeg == null && payload?.data != null) {
        relay = { jpeg: payload.data };
      }
      socket.to(activeRoom).emit('duel:peer-frame', relay);
    });

    socket.on('duel:rep', ({ count }) => {
      if (!activeRoom) return;
      const state = getRoomState(activeRoom);
      if (!state.active) return;
      const repCount = Number(count) || 0;
      state.scores.set(me.publicId, repCount);
      socket.to(activeRoom).emit('duel:peer-rep', {
        publicId: me.publicId,
        count: repCount,
      });
    });

    // --- Room-code lobby ---

    socket.on('room:create', () => {
      // Remove any previous code this host created
      for (const [code, entry] of codeRooms) {
        if (entry.hostSocketId === socket.id) codeRooms.delete(code);
      }

      const code = generateRoomCode();
      codeRooms.set(code, {
        hostSocketId: socket.id,
        hostPublicId: me.publicId,
        hostUser: me,
        createdAt: Date.now(),
      });

      socket.emit('room:created', { code });
    });

    socket.on('room:join', ({ code }) => {
      if (!code || typeof code !== 'string' || code.length !== 6) {
        socket.emit('room:error', { message: 'Буруу код' });
        return;
      }

      const entry = codeRooms.get(code);
      if (!entry) {
        socket.emit('room:error', { message: 'Код олдсонгүй эсвэл хугацаа дууссан' });
        return;
      }

      if (entry.hostPublicId === me.publicId) {
        socket.emit('room:error', { message: 'Өөрийн өрөөнд нэгдэх боломжгүй' });
        return;
      }

      // Consume the code — one-time use only
      codeRooms.delete(code);

      const hostSocket = io.sockets.sockets.get(entry.hostSocketId);
      const hostUser = entry.hostUser;

      // Tell the joiner who their opponent (the host) is.
      // Flutter's DuelHubService will call joinDuel(opponentPublicId) → emits duel:join.
      socket.emit('room:joined', {
        opponentPublicId: entry.hostPublicId,
        opponentName: hostUser.displayName || 'Хэрэглэгч',
        opponentPhotoUrl: hostUser.photoUrl || null,
      });

      // Tell the host who joined.
      // Same flow: Flutter calls joinDuel(joinerPublicId) → emits duel:join.
      if (hostSocket) {
        hostSocket.emit('room:joined', {
          opponentPublicId: me.publicId,
          opponentName: me.displayName || 'Хэрэглэгч',
          opponentPhotoUrl: me.photoUrl || null,
        });
      }
    });

    // --- Observer / Spectator events ---

    socket.on('observer:join', ({ roomId }) => {
      if (!roomId || typeof roomId !== 'string') return;
      const state = roomState.get(roomId);
      socket.join(roomId);

      if (!observers.has(roomId)) {
        observers.set(roomId, new Set());
      }
      observers.get(roomId).add(socket.id);

      const meta = activeRoomsMeta.get(roomId) || {};
      socket.emit('observer:joined', {
        roomId,
        playerA: meta.playerA || null,
        playerB: meta.playerB || null,
        active: state?.active ?? false,
        endsAt: state?.endsAt ?? null,
        scores: state ? Object.fromEntries(state.scores) : {},
      });
    });

    socket.on('observer:leave', ({ roomId }) => {
      if (!roomId) return;
      socket.leave(roomId);
      if (observers.has(roomId)) {
        observers.get(roomId).delete(socket.id);
        if (observers.get(roomId).size === 0) {
          observers.delete(roomId);
        }
      }
    });

    socket.on('disconnect', () => {
      // Clean up observer sets
      for (const [rId, set] of observers) {
        if (set.has(socket.id)) {
          set.delete(socket.id);
          if (set.size === 0) observers.delete(rId);
        }
      }

      // Clean up any hosted code room
      for (const [code, entry] of codeRooms) {
        if (entry.hostSocketId === socket.id) codeRooms.delete(code);
      }

      if (!activeRoom) return;
      const roomId = activeRoom;
      const publicId = me.publicId;
      activeRoom = null;

      setTimeout(() => {
        const userStillOnline = (io.sockets.adapter.rooms.get(userRoom(publicId))?.size ?? 0) > 0;
        if (userStillOnline) return;

        const state = roomState.get(roomId);
        if (state) {
          state.ready.delete(publicId);
        }
        io.to(roomId).emit('duel:peer-left', { publicId });

        const peersRemaining = io.sockets.adapter.rooms.get(roomId)?.size ?? 0;
        if (state?.active && peersRemaining < 2) {
          endDuel(io, roomId);
        } else if (state && !state.active) {
          emitReadyUpdate(io, roomId);
        }
        if (peersRemaining === 0) {
          resetRoomOnEmpty(roomId);
        }
      }, 4000);
    });

    socket.on('duel:leave', () => {
      if (!activeRoom) return;
      const roomId = activeRoom;
      leaveActiveRoom();
      const room = io.sockets.adapter.rooms.get(roomId);
      if (!room || room.size === 0) {
        resetRoomOnEmpty(roomId);
      }
    });
  });
}

module.exports = { attachDuelSocket, duelRoomId, getActiveRooms };

