// import express from "express";
// import dotenv from "dotenv";
// import cookieParser from "cookie-parser";
// import cors from "cors";

// import path from "path";

// import { connectDB } from "./lib/db.js";

// import authRoutes from "./routes/auth.route.js";
// import messageRoutes from "./routes/message.route.js";
// import { app, server } from "./lib/socket.js";

// dotenv.config();



// const PORT = process.env.PORT;
// const __dirname = path.resolve();

// // app.use(express.json());
// app.use(cookieParser());
// app.use( cors({
//     origin: "http://localhost:5173",
//     credentials: true,
//   })
// );

// app.use(express.json({ limit: '20mb' })); //Added

// app.use("/api/auth", authRoutes);
// app.use("/api/messages", messageRoutes);

// if (process.env.NODE_ENV === "production") {
//   app.use(express.static(path.join(__dirname, "../frontend/dist")));

//   app.get("*", (req, res) => {
//     res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
//   });
// }

// server.listen(PORT, () => {
//   console.log("server is running on PORT:" + PORT);
//   connectDB();
// });


//Added from Chatgpt

import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";

import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
// import chatbotRoutes from "./routes/chatbot.route.js"; // Remove if not used

dotenv.config();
const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

const app = express();

// HTTP and WebSocket server
const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

// Store userId => socketId map
const userSocketMap = {}; // { userId: socketId }

export const getReceiverSocketId = (userId) => {
  return userSocketMap[userId];
};

// Socket.IO handlers
io.on("connection", (socket) => {
  console.log("✅ A user connected:", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    socket.join(userId); // Join a room for direct messaging
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("typing", ({ from, to }) => {
    if (to && userSocketMap[to]) {
      io.to(to).emit("typing", { from });
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ A user disconnected:", socket.id);

    // Remove from userSocketMap
    if (userId && userSocketMap[userId] === socket.id) {
      delete userSocketMap[userId];
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// Middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
// app.use("/api/chatbot", chatbotRoutes); // Uncomment if chatbot is used

// Serve frontend (production)
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
}

// Connect DB & Start Server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on PORT: ${PORT}`);
  connectDB();
});
