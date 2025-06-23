import express from "express"
import dotenv from "dotenv"
import cookieParser from "cookie-parser"
import cors from "cors"
import path from "path"
import { createServer } from "http"
import { Server } from "socket.io"

import { connectDB } from "./lib/db.js"
import authRoutes from "./routes/auth.route.js"
import messageRoutes from "./routes/message.route.js"
import Message from "./models/message.model.js"

dotenv.config()
const PORT = process.env.PORT || 5001
const __dirname = path.resolve()

const app = express()

// HTTP and WebSocket server
const httpServer = createServer(app)
export const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
})

// Store userId => socketId map
const userSocketMap = {} // { userId: socketId }

export const getReceiverSocketId = (userId) => {
  return userSocketMap[userId]
}

// Socket.IO handlers
io.on("connection", async (socket) => {
  console.log("✅ A user connected:", socket.id)

  const userId = socket.handshake.query.userId
  if (userId) {
    userSocketMap[userId] = socket.id
    socket.join(userId) // Join a room for direct messaging
    console.log(`User ${userId} is now online with socket ${socket.id}`)

    // When user comes online, mark their pending messages as delivered
    try {
      const pendingMessages = await Message.find({
        receiverId: userId,
        deliveredTo: { $ne: userId }, // Messages not yet delivered to this user
      })

      console.log(`User ${userId} came online. Found ${pendingMessages.length} pending messages`)

      for (const msg of pendingMessages) {
        // Mark as delivered
        if (!msg.deliveredTo.includes(userId)) {
          msg.deliveredTo.push(userId)
          await msg.save()

          // Notify sender about delivery
          const senderSocketId = getReceiverSocketId(msg.senderId.toString())
          if (senderSocketId) {
            io.to(senderSocketId).emit("messageDelivered", {
              messageId: msg._id,
              userId: userId,
            })
            console.log(`Delivery notification sent for pending message ${msg._id}`)
          }
        }
      }
    } catch (error) {
      console.error("Error marking pending messages as delivered:", error)
    }
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap))

  socket.on("typing", ({ from, to }) => {
    if (to && userSocketMap[to]) {
      io.to(to).emit("typing", { from })
    }
  })

  // Handle message delivered status
  socket.on("messageDelivered", async ({ messageId, userId }) => {
    try {
      const message = await Message.findById(messageId)
      if (message && !message.deliveredTo.includes(userId)) {
        message.deliveredTo.push(userId)
        await message.save()

        // Notify sender
        const senderSocketId = getReceiverSocketId(message.senderId.toString())
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageDelivered", {
            messageId,
            userId,
          })
        }
      }
    } catch (error) {
      console.error("Error updating delivery status:", error)
    }
  })

  // Handle message seen status
  socket.on("messageSeen", async ({ messageId, userId }) => {
    try {
      const message = await Message.findById(messageId)
      if (message && !message.seenBy.includes(userId)) {
        message.seenBy.push(userId)
        message.seenAt = new Date()
        await message.save()

        // Notify sender
        const senderSocketId = getReceiverSocketId(message.senderId.toString())
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageSeen", {
            messageId,
            seenBy: userId,
            seenAt: message.seenAt,
          })
        }
      }
    } catch (error) {
      console.error("Error updating seen status:", error)
    }
  })

  socket.on("disconnect", () => {
    console.log("❌ A user disconnected:", socket.id)

    // Remove from userSocketMap
    if (userId && userSocketMap[userId] === socket.id) {
      delete userSocketMap[userId]
      console.log(`User ${userId} is now offline`)
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap))
  })
})

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
)
app.use(cookieParser())
app.use(express.json({ limit: "20mb" }))
app.use(express.urlencoded({ extended: true, limit: "20mb" }))

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/messages", messageRoutes)

// Serve frontend (production)
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")))

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"))
  })
}

// Connect DB & Start Server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on PORT: ${PORT}`)
  connectDB()
})
