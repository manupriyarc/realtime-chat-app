// import { Server } from "socket.io";
// import http from "http";
// import express from "express";


// const app = express();
// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: ["http://localhost:5173"], // frontend URL
//     methods: ["GET", "POST"],
//     credentials: true,
//   },
// });

// // Map to keep track of userId -> socketId
// const userSocketMap = {}; // { userId: socketId }

// // Returns socketId of a user
// export function getReceiverSocketId(userId) {
//   return userSocketMap[userId];
// }

// io.on("connection", (socket) => {
//   console.log("✅ A user connected:", socket.id);

//   const userId = socket.handshake.query.userId;
//   if (userId) {
//     userSocketMap[userId] = socket.id;
//     socket.join(userId); // Join the room named after userId
//   }

//   io.emit("getOnlineUsers", Object.keys(userSocketMap));

//   // Handle typing event
//   socket.on("typing", ({ from, to }) => {
//     if (to && userSocketMap[to]) {
//       io.to(to).emit("typing", { from });
//     }
//   });

//   // Handle disconnect
//   socket.on("disconnect", () => {
//     console.log("❌ A user disconnected:", socket.id);

//     // Remove the disconnected socket from userSocketMap
//     if (userId && userSocketMap[userId] === socket.id) {
//       delete userSocketMap[userId];
//     }

//     io.emit("getOnlineUsers", Object.keys(userSocketMap));
//   });
// });

// export { io, app, server };


// backup socket.js file if doesn't work
import http from "http"
import express from "express"
import { Server } from "socket.io"
import Message from "../models/message.model.js"
import mongoose from "mongoose"

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
})

const userSocketMap = {}

// Get the socket ID for a user
export function getReceiverSocketId(userId) {
  return userSocketMap[userId]
}

export function getOnlineUsers() {
  return Object.keys(userSocketMap)
}

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id)

  const userId = socket.handshake.query.userId
  if (userId && userId !== "undefined") {
    userSocketMap[userId] = socket.id
    console.log(`User ${userId} mapped to socket ${socket.id}`)

    // Broadcast online users
    io.emit("getOnlineUsers", Object.keys(userSocketMap))
  }

  // Handle new message delivery confirmation
  socket.on("confirmDelivery", async ({ messageId, userId }) => {
    try {
      console.log("Confirming delivery for message:", messageId, "to user:", userId)

      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        console.log("Invalid messageId:", messageId)
        return
      }

      const message = await Message.findById(messageId)
      if (!message) {
        console.log("Message not found:", messageId)
        return
      }

      // Add to deliveredTo if not already there
      if (!message.deliveredTo.some((id) => id.toString() === userId.toString())) {
        message.deliveredTo.push(userId)
        await message.save()
        console.log("Message marked as delivered:", messageId)

        // Notify sender about delivery
        const senderSocketId = getReceiverSocketId(message.senderId.toString())
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageDelivered", {
            messageId: messageId,
            userId: userId,
            deliveredTo: message.deliveredTo,
          })
          console.log("Delivery notification sent to sender")
        }
      }
    } catch (error) {
      console.error("Error confirming delivery:", error)
    }
  })

  // Handle message seen
  socket.on("markAsSeen", async ({ messageId, userId }) => {
    try {
      console.log("Marking message as seen:", messageId, "by user:", userId)

      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        console.log("Invalid messageId:", messageId)
        return
      }

      const message = await Message.findById(messageId)
      if (!message) {
        console.log("Message not found:", messageId)
        return
      }

      // Add to seenBy if not already there
      if (!message.seenBy.some((id) => id.toString() === userId.toString())) {
        message.seenBy.push(userId)
        message.seenAt = new Date()
        await message.save()
        console.log("Message marked as seen:", messageId)

        // Notify sender about seen status
        const senderSocketId = getReceiverSocketId(message.senderId.toString())
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageSeen", {
            messageId: messageId,
            seenBy: userId,
            seenAt: message.seenAt,
            seenByArray: message.seenBy,
          })
          console.log("Seen notification sent to sender")
        }
      }
    } catch (error) {
      console.error("Error marking as seen:", error)
    }
  })

  // Typing indicators
  socket.on("typing", ({ from, to }) => {
    const receiverSocketId = userSocketMap[to]
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { from })
    }
  })

  socket.on("stopTyping", ({ from, to }) => {
    const receiverSocketId = userSocketMap[to]
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopTyping", { from })
    }
  })

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id)

    // Find and remove user from userSocketMap
    for (const [uid, socketId] of Object.entries(userSocketMap)) {
      if (socketId === socket.id) {
        delete userSocketMap[uid]
        console.log(`User ${uid} removed from socket map`)
        break
      }
    }

    // Broadcast updated online users
    io.emit("getOnlineUsers", Object.keys(userSocketMap))
  })
})

export { io, app, server }
