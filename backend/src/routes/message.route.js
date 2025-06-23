// import express from "express";
// import { protectRoute } from "../middleware/auth.middleware.js";
// import { getMessages, getUsersForSidebar, sendMessage } from "../controllers/message.controller.js";

// const router = express.Router();

// router.get("/users", protectRoute, getUsersForSidebar);
// router.get("/:id", protectRoute, getMessages);

// router.post("/send/:id", protectRoute, sendMessage);

// export default router;

import express from "express";
import multer from "multer";
import path from "path";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
getMessages,
getUsersForSidebar,
sendMessage,
uploadImage,
} from "../controllers/message.controller.js";
import Message from "../models/message.model.js";
import { io } from "../index.js"; // ✅ updated to import from index.js (where io is exported)

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
destination: (req, file, cb) => {
cb(null, "uploads/"); // Ensure this folder exists and is publicly accessible
},
filename: (req, file, cb) => {
const uniqueName = `${Date.now()}-${file.originalname}`;
cb(null, uniqueName);
},
});

const upload = multer({ storage });

// ========== ROUTES ==========

// Fetch all users for sidebar
router.get("/users", protectRoute, getUsersForSidebar);

// Get messages with a specific user
router.get("/:id", protectRoute, getMessages);

// Upload an image independently (e.g., pasted image)
router.post("/upload", protectRoute, uploadImage);

// Send a message with optional file (image, document, video)
router.post(
"/send/:userId",
protectRoute,
upload.single("file"),
async (req, res) => {
try {
const { text, image } = req.body;
const file = req.file;

  const messageData = {
    senderId: req.user._id,
    receiverId: req.params.userId,
    text: text || "",
    image: image || "",
    fileUrl: file ? `/uploads/${file.filename}` : null,
    fileName: file?.originalname || null,
  };

  const savedMessage = await Message.create(messageData);

  // Emit new message to receiver via socket.io
  io.to(req.params.userId).emit("newMessage", savedMessage);

  res.status(200).json(savedMessage);
} catch (error) {
  console.error("Error sending message:", error.message);
  res.status(500).json({ error: "Failed to send message" });
}
}
);

export default router;