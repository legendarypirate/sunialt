const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, WorkoutRoom, DeviceToken } = require('../models');
const { sendToTokens } = require('../services/fcm');

const PRE_COUNTDOWN_MS = 4_000; // 3-2-1-GO! overlay on client
const DUEL_DURATION_MS = 60_000 + PRE_COUNTDOWN_MS; // total timer includes pre-countdown
const ROOM_LIFETIME_MS = 24 * 60 * 60 * 1000;

/** @type {Map<string, { ready: Set<number>, active: boolean, endsAt: number|null, timer: NodeJS.Timeout|null, scores: Map<number, number> }>} */
const roomState = new Map();

/** Connected room members only. Room records themselves are persisted for 24 hours. */
const codeRoomMembers = new Map();

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
      type: '1min',
      isCodeRoom: false,
      code: null,
      startedAt: null,
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
    durationSec: 64,
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

function endDuel(io, roomId, quitterPublicId = null) {
  const state = roomState.get(roomId);
  if (!state || !state.active) return;

  state.active = false;
  clearRoomTimer(state);

  const [idA, idB] = duelParticipants(roomId);
  const scoreA = state.scores.get(idA) ?? 0;
  const scoreB = state.scores.get(idB) ?? 0;

  let winnerPublicId = null;
  let reason = 'normal';

  if (quitterPublicId != null) {
    winnerPublicId = Number(quitterPublicId) === idA ? idB : idA;
    reason = 'forfeit';
  } else if (scoreA > scoreB) {
    winnerPublicId = idA;
  } else if (scoreB > scoreA) {
    winnerPublicId = idB;
  }

  const durationSec = state.type === 'patience'
    ? Math.max(1, Math.floor((Date.now() - (state.startedAt || Date.now())) / 1000))
    : 64;

  io.to(roomId).emit('duel:ended', {
    scores: { [idA]: scoreA, [idB]: scoreB },
    winnerPublicId,
    quitterPublicId: quitterPublicId != null ? Number(quitterPublicId) : null,
    reason,
    tie: winnerPublicId == null,
    type: state.type || '1min',
    durationSec,
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
  state.startedAt = Date.now();
  clearRoomTimer(state);

  const isPatience = state.type === 'patience';
  if (isPatience) {
    state.endsAt = null; // No timer timeout for patience
  } else {
    state.endsAt = Date.now() + DUEL_DURATION_MS;
    state.timer = setTimeout(() => endDuel(io, roomId), DUEL_DURATION_MS);
  }

  // Store meta for room listing
  const [idA, idB] = duelParticipants(roomId);
  const existing = activeRoomsMeta.get(roomId) || {};
  activeRoomsMeta.set(roomId, { ...existing, startedAt: state.startedAt });

  io.to(roomId).emit('duel:started', {
    endsAt: state.endsAt,
    type: state.type || '1min',
    durationSec: isPatience ? null : 64,
  });
}

function resetRoomOnEmpty(roomId) {
  const state = roomState.get(roomId);
  if (!state) return;
  clearRoomTimer(state);
  roomState.delete(roomId);
  activeRoomsMeta.delete(roomId);
  observers.delete(roomId);
}

async function pruneCodeRooms() {
  await WorkoutRoom.destroy({ where: { expiresAt: { [Op.lte]: new Date() } } });

  // Older deployments allowed several rooms per host. Keep only the newest
  // one so the application-level rule is also applied to existing data.
  const rooms = await WorkoutRoom.findAll({
    attributes: ['id', 'hostUserId', 'code'],
    order: [['createdAt', 'DESC']],
  });
  const seenHosts = new Set();
  const duplicateIds = [];
  for (const room of rooms) {
    if (seenHosts.has(room.hostUserId)) {
      duplicateIds.push(room.id);
      codeRoomMembers.delete(room.code);
    } else {
      seenHosts.add(room.hostUserId);
    }
  }
  if (duplicateIds.length > 0) {
    await WorkoutRoom.destroy({ where: { id: { [Op.in]: duplicateIds } } });
  }

  for (const [code, members] of codeRoomMembers) {
    if (members.size === 0) codeRoomMembers.delete(code);
  }
}

async function generateRoomCode() {
  await pruneCodeRooms();
  let code;
  do {
    code = String(Math.floor(100000 + Math.random() * 900000));
  } while (await WorkoutRoom.count({ where: { code } }));
  return code;
}

/** Returns persistent lobbies plus currently started duels for the room browser. */
async function getActiveRooms() {
  await pruneCodeRooms();
  const savedRooms = await WorkoutRoom.findAll({
    where: { expiresAt: { [Op.gt]: new Date() } },
    include: [{
      model: User,
      as: 'host',
      attributes: ['publicId', 'displayName', 'photoUrl'],
    }],
    order: [['createdAt', 'DESC']],
  });

  const result = savedRooms.map((room) => ({
    roomId: `code:${room.code}`,
    code: room.code,
    kind: 'lobby',
    type: room.type,
    maxParticipants: room.maxParticipants,
    participantCount: codeRoomMembers.get(room.code)?.size ?? 0,
    playerA: room.host ? {
      publicId: room.host.publicId,
      displayName: room.host.displayName || 'Хэрэглэгч',
      photoUrl: room.host.photoUrl,
    } : null,
    playerB: null,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
    observerCount: 0,
  }));

  for (const [roomId, meta] of activeRoomsMeta) {
    const state = roomState.get(roomId);
    if (!state || !state.active) continue;
    result.push({
      roomId,
      kind: 'live',
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
    let activeCodeRoom = null;

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
      if (state?.isCodeRoom) {
        // In open/persistent code rooms, a user leaving simply notifies peers and records stats. No win/draw endDuel!
        if (state.active) {
          state.active = false;
          clearRoomTimer(state);
          state.ready.clear();
          state.endsAt = null;
          io.to(roomId).emit('duel:ended', {
            scores: Object.fromEntries(state.scores),
            reason: 'peer-left',
            isCodeRoom: true,
          });
        }
      } else if (state?.active && peersRemaining < 2) {
        endDuel(io, roomId, me.publicId);
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

    const leaveCodeRoom = () => {
      if (!activeCodeRoom) return;
      const members = codeRoomMembers.get(activeCodeRoom);
      if (members?.get(me.publicId)?.socketId === socket.id) {
        members.delete(me.publicId);
        if (members.size === 0) codeRoomMembers.delete(activeCodeRoom);
      }
      activeCodeRoom = null;
    };

    const enterCodeRoom = async (code) => {
      await pruneCodeRooms();
      const room = await WorkoutRoom.findOne({
        where: { code, expiresAt: { [Op.gt]: new Date() } },
        include: [{ model: User, as: 'host' }],
      });
      if (!room) {
        socket.emit('room:error', { message: 'Код олдсонгүй эсвэл хугацаа дууссан' });
        return;
      }

      if (activeCodeRoom && activeCodeRoom !== code) leaveCodeRoom();
      const members = codeRoomMembers.get(code) || new Map();
      const existingMember = members.get(me.publicId);
      const other = [...members.values()].find((member) => member.publicId !== me.publicId);
      const maxAllowed = room.maxParticipants || 2;
      if (!existingMember && members.size >= maxAllowed) {
        socket.emit('room:error', {
          message: `Өрөө дүүрсэн байна (дээд тал нь ${maxAllowed} хүн).`,
        });
        return;
      }

      members.set(me.publicId, {
        socketId: socket.id,
        publicId: me.publicId,
        user: me,
      });
      codeRoomMembers.set(code, members);
      activeCodeRoom = code;

      const common = {
        code,
        type: room.type,
        maxParticipants: room.maxParticipants,
        expiresAt: room.expiresAt.getTime(),
      };
      socket.emit('room:entered', common);

      if (!other) return;
      const roomId = duelRoomId(me.publicId, other.publicId);
      const dState = getRoomState(roomId);
      dState.type = room.type || '1min';
      dState.isCodeRoom = true;
      dState.code = code;

      const otherSocket = io.sockets.sockets.get(other.socketId);
      socket.emit('room:joined', {
        ...common,
        opponentPublicId: other.publicId,
        opponentName: other.user.displayName || 'Хэрэглэгч',
        opponentPhotoUrl: other.user.photoUrl || null,
      });
      if (otherSocket) {
        otherSocket.emit('room:joined', {
          ...common,
          opponentPublicId: me.publicId,
          opponentName: me.displayName || 'Хэрэглэгч',
          opponentPhotoUrl: me.photoUrl || null,
        });
      }
    };

    socket.on('duel:invite', async ({ opponentPublicId }) => {
      const opponentId = Number(opponentPublicId);
      if (!Number.isFinite(opponentId) || opponentId <= 0 || opponentId === me.publicId) {
        socket.emit('duel:error', { message: 'Буруу ID' });
        return;
      }

      const targetRoom = userRoom(opponentId);
      const online = (io.sockets.adapter.rooms.get(targetRoom)?.size ?? 0) > 0;

      if (!online) {
        // Send FCM push notification to the offline user
        try {
          const targetUser = await User.findOne({ where: { publicId: opponentId } });
          if (targetUser) {
            const tokens = await DeviceToken.findAll({ where: { userId: targetUser.id } });
            if (tokens.length > 0) {
              const senderName = me.displayName || 'Хэрэглэгч';
              await sendToTokens(tokens, {
                title: 'Тулааны урилга! 🥊',
                body: `${senderName} тантай тулаан хийхийг хүсэж байна`,
                data: {
                  type: 'duel_invite',
                  fromPublicId: String(me.publicId),
                  fromName: senderName,
                  fromPhotoUrl: me.photoUrl || '',
                },
              });
              socket.emit('duel:invite-result', { ok: false, reason: 'offline', fcmSent: true });
              return;
            }
          }
        } catch (err) {
          console.warn('[Duel] FCM invite fallback failed:', err.message);
        }
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

    socket.on('room:create', async (opts = {}) => {
      const roomType = opts.type === 'patience' ? 'patience' : '1min';
      const maxParticipants = Number.isInteger(Number(opts.maxParticipants))
        ? Math.max(2, Math.min(20, Number(opts.maxParticipants)))
        : 2;

      try {
        const expiresAt = new Date(Date.now() + ROOM_LIFETIME_MS);
        await pruneCodeRooms();
        // Clean up any existing room created by this host
        const oldRooms = await WorkoutRoom.findAll({ where: { hostUserId: me.id } });
        for (const r of oldRooms) {
          codeRoomMembers.delete(r.code);
        }
        await WorkoutRoom.destroy({ where: { hostUserId: me.id } });
        const code = await generateRoomCode();
        await WorkoutRoom.create({
          code,
          hostUserId: me.id,
          type: roomType,
          maxParticipants,
          expiresAt,
        });
        socket.emit('room:created', {
          code,
          type: roomType,
          maxParticipants,
          expiresAt: expiresAt.getTime(),
        });
        await enterCodeRoom(code);
      } catch (err) {
        socket.emit('room:error', { message: err.message || 'Өрөө үүсгэж чадсангүй' });
      }
    });

    socket.on('room:join', async ({ code }) => {
      if (!code || typeof code !== 'string' || code.length !== 6) {
        socket.emit('room:error', { message: 'Буруу код' });
        return;
      }
      try {
        await enterCodeRoom(code);
      } catch (err) {
        socket.emit('room:error', { message: err.message || 'Өрөөнд нэгдэж чадсангүй' });
      }
    });

    socket.on('room:leave', leaveCodeRoom);

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

      // Presence is removed, but the persisted room remains joinable for 24 hours.
      leaveCodeRoom();

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
        if (state?.isCodeRoom) {
          if (state.active) {
            state.active = false;
            clearRoomTimer(state);
            state.ready.clear();
            state.endsAt = null;
            io.to(roomId).emit('duel:ended', {
              scores: Object.fromEntries(state.scores),
              reason: 'peer-left',
              isCodeRoom: true,
            });
          }
        } else if (state?.active && peersRemaining < 2) {
          endDuel(io, roomId, publicId);
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

