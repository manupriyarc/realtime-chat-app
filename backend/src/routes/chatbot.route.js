import express from "express";
import { handleChatbot } from "../controllers/chatbot.controller.js";

const router = express.Router();

router.post("/", handleChatbot);

export default router;
