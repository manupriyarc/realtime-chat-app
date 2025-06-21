import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const uploadImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: "No image provided" });

    const result = await cloudinary.uploader.upload(image, {
      folder: "chat-images", // Optional: for organizing images in Cloudinary
    });

    res.status(200).json({ url: result.secure_url });
  } catch (error) {
    console.error("Upload error:", error.message);
    res.status(500).json({ message: "Image upload failed" });
  }
};


//Message Seen 
export const markMessagesAsSeen = async (req, res) => {
  try {
    const userId = req.user._id;
    const { senderId } = req.body;

    await Message.updateMany(
      { senderId, receiverId: userId, status: { $ne: "seen" } },
      { $set: { status: "seen" } }
    );

    io.to(getReceiverSocketId(senderId)).emit("messagesSeen", { senderId: userId });

    res.status(200).json({ message: "Messages marked as seen" });
  } catch (error) {
    console.error("Error marking messages as seen:", error.message);
    res.status(500).json({ error: "Failed to mark as seen" });
  }
};
