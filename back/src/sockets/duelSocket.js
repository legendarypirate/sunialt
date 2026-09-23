const jwt = require('jsonwebtoken');
const { User } = require('../models');

const DUEL_DURATION_MS = 60_000;

/** @type {Map<string, { ready: Set<number>, active: boolean, endsAt: number|null, timer: NodeJS.Timeout|null, scores: Map<number, number> }>} */
const roomState = new Map();

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
        if (state.active) {
          endDuel(io, roomId);
        } else {
          emitReadyUpdate(io, roomId);
        }
      }
      socket.to(roomId).emit('duel:peer-left', { publicId: me.publicId });
      socket.leave(roomId);
      activeRoom = null;
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
      const state = getRoomState(activeRoom);
      if (!state.active) return;
      socket.to(activeRoom).emit('duel:peer-frame', payload);
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

    socket.on('disconnect', () => {
      if (activeRoom) {
        const roomId = activeRoom;
        const room = io.sockets.adapter.rooms.get(roomId);
        leaveActiveRoom();
        if (!room || room.size === 0) {
          resetRoomOnEmpty(roomId);
        }
      }
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

module.exports = { attachDuelSocket, duelRoomId };
