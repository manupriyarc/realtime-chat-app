import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"], // frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Map to keep track of userId -> socketId
const userSocketMap = {}; // { userId: socketId }

// Returns socketId of a user
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("✅ A user connected:", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    socket.join(userId); // Join the room named after userId
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Handle typing event
  socket.on("typing", ({ from, to }) => {
    if (to && userSocketMap[to]) {
      io.to(to).emit("typing", { from });
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("❌ A user disconnected:", socket.id);

    // Remove the disconnected socket from userSocketMap
    if (userId && userSocketMap[userId] === socket.id) {
      delete userSocketMap[userId];
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

//Seen Indicator
socket.on("markAsSeen", async ({ senderId }) => {
  await Message.updateMany(
    { senderId, receiverId: socket.userId, status: { $ne: "seen" } },
    { $set: { status: "seen" } }
  );
  io.to(getReceiverSocketId(senderId)).emit("messagesSeen", { senderId: socket.userId });
});

export { io, app, server };
