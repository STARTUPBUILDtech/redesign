import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
  if (!socket) {
    try {
      socket = io("http://localhost:5000", {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      socket.on("connect", () => {
        console.log("[SocketService] Connected to PayKudi server.js (id:", socket.id, ")");
      });

      socket.on("connect_error", (err) => {
        console.warn("[SocketService] Connection error to server.js:", err.message);
      });
    } catch (e) {
      console.warn("[SocketService] Failed to initialize socket:", e);
    }
  }
  return socket;
}

export function joinRoomSocket(roomId, user, role) {
  const s = getSocket();
  if (s && roomId) {
    s.emit("join_room", { roomId, user, role });
  }
}

export function emitAcceptInviteSocket(roomId, roomData) {
  const s = getSocket();
  if (s && roomId) {
    s.emit("accept_invite", { roomId, roomData });
  }
}

export function emitCreatorProceededSocket(roomId, specifications, itemImage) {
  const s = getSocket();
  if (s && roomId) {
    s.emit("creator_proceeded", { roomId, specifications, itemImage });
  }
}

export function emitDeclineInviteSocket(roomId, reason) {
  const s = getSocket();
  if (s && roomId) {
    s.emit("decline_invite", { roomId, reason });
  }
}

export function emitSendInviteSocket(room) {
  const s = getSocket();
  if (s && room) {
    s.emit("send_invite", { room });
  }
}
