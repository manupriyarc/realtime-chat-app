import express from "express";
import multer from "multer";
import path from "path";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getMessages,
  getUsersForSidebar,
  sendMessage,
  uploadImage,
  editMessage,
  deleteMessage, // ✅ Import deleteMessage controller
} from "../controllers/message.controller.js";
import Message from "../models/message.model.js";
import { io } from "../index.js"; // ✅ Import socket.io instance

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// ========== ROUTES ==========

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);
router.post("/upload", protectRoute, uploadImage);

router.post("/send/:userId", protectRoute, upload.single("file"), async (req, res) => {
  try {
    const { text, image } = req.body;
    const file = req.file;

    const messageData = {
      senderId: req.user._id,
      receiverId: req.params.userId,
      text: text || "",
      image: image || "",
      fileUrl: file ? `/uploads/${file.filename} `: null,
      fileName: file?.originalname || null,
    };

    const savedMessage = await Message.create(messageData);
    io.to(req.params.userId).emit("newMessage", savedMessage);
    res.status(200).json(savedMessage);
  } catch (error) {
    console.error("Error sending message:", error.message);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ✅ Edit and Delete routes
router.put("/edit/:id", protectRoute, editMessage);
router.delete("/:id", protectRoute, deleteMessage); // ✅ Now added

export default router;