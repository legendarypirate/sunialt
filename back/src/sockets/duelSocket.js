const jwt = require('jsonwebtoken');
const { User } = require('../models');

function duelRoomId(publicIdA, publicIdB) {
  const ids = [Number(publicIdA), Number(publicIdB)].sort((a, b) => a - b);
  return `duel:${ids[0]}:${ids[1]}`;
}

function userRoom(publicId) {
  return `user:${publicId}`;
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

    const joinDuelRoom = (opponentId) => {
      const roomId = duelRoomId(me.publicId, opponentId);
      if (activeRoom && activeRoom !== roomId) {
        socket.leave(activeRoom);
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
      socket.to(activeRoom).emit('duel:peer-frame', payload);
    });

    socket.on('duel:rep', ({ count }) => {
      if (!activeRoom) return;
      socket.to(activeRoom).emit('duel:peer-rep', {
        publicId: me.publicId,
        count: Number(count) || 0,
      });
    });

    socket.on('disconnect', () => {
      if (activeRoom) {
        socket.to(activeRoom).emit('duel:peer-left', { publicId: me.publicId });
      }
    });

    socket.on('duel:leave', () => {
      if (activeRoom) {
        socket.to(activeRoom).emit('duel:peer-left', { publicId: me.publicId });
        socket.leave(activeRoom);
        activeRoom = null;
      }
    });
  });
}

module.exports = { attachDuelSocket, duelRoomId };
