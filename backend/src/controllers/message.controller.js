// import User from "../models/user.model.js";
// import Message from "../models/message.model.js";

// import cloudinary from "../lib/cloudinary.js";
// import { getReceiverSocketId, io } from "../lib/socket.js";

// export const getUsersForSidebar = async (req, res) => {
//   try {
//     const loggedInUserId = req.user._id;
//     const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

//     res.status(200).json(filteredUsers);
//   } catch (error) {
//     console.error("Error in getUsersForSidebar: ", error.message);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// export const getMessages = async (req, res) => {
//   try {
//     const { id: userToChatId } = req.params;
//     const myId = req.user._id;

//     const messages = await Message.find({
//       $or: [
//         { senderId: myId, receiverId: userToChatId },
//         { senderId: userToChatId, receiverId: myId },
//       ],
//     });

//     res.status(200).json(messages);
//   } catch (error) {
//     console.log("Error in getMessages controller: ", error.message);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// export const sendMessage = async (req, res) => {
//   try {
//     const { text, image } = req.body;
//     const { id: receiverId } = req.params;
//     const senderId = req.user._id;

//     let imageUrl;
//     if (image) {
//       // Upload base64 image to cloudinary
//       const uploadResponse = await cloudinary.uploader.upload(image);
//       imageUrl = uploadResponse.secure_url;
//     }

//     const newMessage = new Message({
//       senderId,
//       receiverId,
//       text,
//       image: imageUrl,
//     });

//     await newMessage.save();

//     const receiverSocketId = getReceiverSocketId(receiverId);
//     if (receiverSocketId) {
//       io.to(receiverSocketId).emit("newMessage", newMessage);
//     }

//     res.status(201).json(newMessage);
//   } catch (error) {
//     console.log("Error in sendMessage controller: ", error.message);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// export const uploadImage = async (req, res) => {
//   try {
//     const { image } = req.body;
//     if (!image) return res.status(400).json({ message: "No image provided" });

//     const result = await cloudinary.uploader.upload(image, {
//       folder: "chat-images", // Optional: for organizing images in Cloudinary
//     });

//     res.status(200).json({ url: result.secure_url });
//   } catch (error) {
//     console.error("Upload error:", error.message);
//     res.status(500).json({ message: "Image upload failed" });
//   }
// };
// message.controller.js
import User from "../models/user.model.js"
import Message from "../models/message.model.js"
import cloudinary from "../lib/cloudinary.js"
import { getReceiverSocketId, io } from "../index.js"

// Sidebar users
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id
    const users = await User.find({ _id: { $ne: loggedInUserId } }).select("-password")
    res.status(200).json(users)
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message)
    res.status(500).json({ error: "Internal server error" })
  }
}

// Chat messages between two users
export const getMessages = async (req, res) => {
  const { id: userToChatId } = req.params
  const myId = req.user._id

  try {
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    })

    // Mark messages as delivered and seen when fetching
    for (const msg of messages) {
      let updated = false

      // Update "delivered" status
      if (msg.receiverId.toString() === myId.toString() && !msg.deliveredTo.includes(myId)) {
        msg.deliveredTo.push(myId)
        updated = true

        const senderSock = getReceiverSocketId(msg.senderId.toString())
        if (senderSock) {
          io.to(senderSock).emit("messageDelivered", {
            messageId: msg._id,
            userId: myId,
          })
        }
      }

      // Update "seen" status
      if (msg.receiverId.toString() === myId.toString() && !msg.seenBy.includes(myId)) {
        msg.seenBy.push(myId)
        msg.seenAt = new Date()
        updated = true

        const senderSock = getReceiverSocketId(msg.senderId.toString())
        if (senderSock) {
          io.to(senderSock).emit("messageSeen", {
            messageId: msg._id,
            seenBy: myId,
            seenAt: msg.seenAt,
          })
        }
      }

      if (updated) {
        await msg.save()
      }
    }

    res.status(200).json(messages)
  } catch (err) {
    console.error("getMessages error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

// Send message
export const sendMessage = async (req, res) => {
  const { text, image } = req.body
  const { id: receiverId } = req.params
  const senderId = req.user._id

  try {
    let imageUrl = ""
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image)
      imageUrl = uploadResponse.secure_url
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      deliveredTo: [],
      seenBy: [],
    })

    await newMessage.save()

    // Check if receiver is online (has an active socket connection)
    const receiverSocketId = getReceiverSocketId(receiverId)
    console.log(`Checking receiver ${receiverId} online status:`, receiverSocketId ? "ONLINE" : "OFFLINE")

    if (receiverSocketId) {
      // Receiver is online - mark as delivered immediately
      newMessage.deliveredTo.push(receiverId)
      await newMessage.save()
      console.log("✅ Message marked as delivered immediately - receiver is online")

      // Send message ONLY to the specific receiver
      io.to(receiverSocketId).emit("newMessage", newMessage)
      console.log("📤 Message sent to receiver via socket")

      // Notify sender about delivery
      const senderSocketId = getReceiverSocketId(senderId.toString())
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageDelivered", {
          messageId: newMessage._id,
          userId: receiverId,
        })
        console.log("✅ Delivery notification sent to sender")
      }
    } else {
      console.log("❌ Receiver is offline - message not delivered yet")
    }

    res.status(201).json(newMessage)
  } catch (error) {
    console.error("sendMessage error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

// Upload image
export const uploadImage = async (req, res) => {
  try {
    const { image } = req.body
    if (!image) return res.status(400).json({ message: "No image provided" })

    const result = await cloudinary.uploader.upload(image, {
      folder: "chat-images",
    })

    res.status(200).json({ url: result.secure_url })
  } catch (error) {
    console.error("Upload error:", error.message)
    res.status(500).json({ message: "Image upload failed" })
  }
}


