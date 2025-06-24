import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../index.js";

// Get users for sidebar (excluding logged-in user)
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const users = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get chat messages between two users
export const getMessages = async (req, res) => {
  const { id: userToChatId } = req.params;
  const myId = req.user._id;

  try {
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    // Mark messages as delivered and seen
    for (const msg of messages) {
      let updated = false;

      // Mark as delivered
      if (msg.receiverId.toString() === myId.toString() && !msg.deliveredTo.includes(myId)) {
        msg.deliveredTo.push(myId);
        updated = true;

        const senderSock = getReceiverSocketId(msg.senderId.toString());
        if (senderSock) {
          io.to(senderSock).emit("messageDelivered", {
            messageId: msg._id,
            userId: myId,
          });
        }
      }

      // Mark as seen
      if (msg.receiverId.toString() === myId.toString() && !msg.seenBy.includes(myId)) {
        msg.seenBy.push(myId);
        msg.seenAt = new Date();
        updated = true;

        const senderSock = getReceiverSocketId(msg.senderId.toString());
        if (senderSock) {
          io.to(senderSock).emit("messageSeen", {
            messageId: msg._id,
            seenBy: myId,
            seenAt: msg.seenAt,
          });
        }
      }

      if (updated) {
        await msg.save();
      }
    }

    res.status(200).json(messages);
  } catch (err) {
    console.error("getMessages error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  const { text, image } = req.body;
  const { id: receiverId } = req.params;
  const senderId = req.user._id;

  try {
    let imageUrl = "";
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      deliveredTo: [],
      seenBy: [],
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    console.log(`Checking receiver ${receiverId} online status:`, receiverSocketId ? "ONLINE" : "OFFLINE");

    if (receiverSocketId) {
      newMessage.deliveredTo.push(receiverId);
      await newMessage.save();

      io.to(receiverSocketId).emit("newMessage", newMessage);

      const senderSocketId = getReceiverSocketId(senderId.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageDelivered", {
          messageId: newMessage._id,
          userId: receiverId,
        });
      }
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("sendMessage error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Upload image (for pasted images or files)
export const uploadImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: "No image provided" });

    const result = await cloudinary.uploader.upload(image, {
      folder: "chat-images",
    });

    res.status(200).json({ url: result.secure_url });
  } catch (error) {
    console.error("Upload error:", error.message);
    res.status(500).json({ message: "Image upload failed" });
  }
};

// Edit an existing message
export const editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You are not allowed to edit this message" });
    }

    message.text = text;
    message.edited = true;
    await message.save();

    res.status(200).json(message);
  } catch (error) {
    console.error("Edit message error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete an existing message
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You are not allowed to delete this message" });
    }

    await message.deleteOne();

    const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", { messageId: message._id });
    }

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};