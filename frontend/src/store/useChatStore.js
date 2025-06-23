// import { create } from "zustand";
// import toast from "react-hot-toast";
// import { axiosInstance } from "../lib/axios";
// import { useAuthStore } from "./useAuthStore";

// export const useChatStore = create((set, get) => ({
//   messages: [],
//   users: [],
//   selectedUser: null,
//   isUsersLoading: false,
//   isMessagesLoading: false,

//   getUsers: async () => {
//     set({ isUsersLoading: true });
//     try {
//       const res = await axiosInstance.get("/messages/users");
//       set({ users: res.data });
//     } catch (error) {
//       toast.error(error.response.data.message);
//     } finally {
//       set({ isUsersLoading: false });
//     }
//   },

//   getMessages: async (userId) => {
//     set({ isMessagesLoading: true });
//     try {
//       const res = await axiosInstance.get(`/messages/${userId}`);
//       set({ messages: res.data });
//     } catch (error) {
//       toast.error(error.response.data.message);
//     } finally {
//       set({ isMessagesLoading: false });
//     }
//   },

//   //Added
//  sendMessage: async (messageData) => {
//   const { selectedUser, messages } = get();
//   try {
//     let imageUrl = "";

//     if (messageData.image) {
//       const uploadRes = await axiosInstance.post("/messages/upload", {
//         image: messageData.image, // base64 string
//       });
//       imageUrl = uploadRes.data.url;
//     }

//     const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, {
//       text: messageData.text,
//       image: imageUrl,
//     });

//     set({ messages: [...messages, res.data] });
//   } catch (error) {
//     // Defensive check: sometimes error.response may not exist
//     const message = error?.response?.data?.message;
//     toast.error(message);
//   }
// },

//   subscribeToMessages: () => {
//     const { selectedUser } = get();
//     if (!selectedUser) return;

//     const socket = useAuthStore.getState().socket;

//     socket.on("newMessage", (newMessage) => {
//       const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
//       if (!isMessageSentFromSelectedUser) return;

//       set({
//         messages: [...get().messages, newMessage],
//       });
//     });
//   },

//   unsubscribeFromMessages: () => {
//     const socket = useAuthStore.getState().socket;
//     socket.off("newMessage");
//   },

//   setSelectedUser: (selectedUser) => set({ selectedUser }),
// }));

import { create } from "zustand"
import toast from "react-hot-toast"
import { axiosInstance } from "../lib/axios"
import { useAuthStore } from "./useAuthStore"

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true })
    try {
      const res = await axiosInstance.get("/messages/users")
      set({ users: res.data })
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch users.")
    } finally {
      set({ isUsersLoading: false })
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true })
    try {
      const res = await axiosInstance.get(`/messages/${userId}`)
      set({ messages: res.data })
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch messages.")
    } finally {
      set({ isMessagesLoading: false })
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get()
    try {
      let imageUrl = ""

      if (messageData.image) {
        const uploadRes = await axiosInstance.post("/messages/upload", {
          image: messageData.image,
        })
        imageUrl = uploadRes.data.url
      }

      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, {
        text: messageData.text,
        image: imageUrl,
      })

      set({ messages: [...messages, res.data] })
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to send message."
      toast.error(message)
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get()
    const { authUser, socket } = useAuthStore.getState()
    if (!selectedUser || !socket) return

    // Chat-specific message listener (only for displaying messages in current chat)
    socket.on("newMessage", (newMessage) => {
      const { selectedUser: currentSelectedUser } = get()

      // Only add message to current chat if it belongs to the selected conversation
      if (
        currentSelectedUser &&
        ((newMessage.senderId === currentSelectedUser._id && newMessage.receiverId === authUser._id) ||
          (newMessage.senderId === authUser._id && newMessage.receiverId === currentSelectedUser._id))
      ) {
        const { messages } = get()
        set({ messages: [...messages, newMessage] })
        console.log("✅ Message added to current chat")

        // Auto-mark as seen if this is the active chat and window is focused
        if (
          newMessage.receiverId === authUser._id &&
          currentSelectedUser._id === newMessage.senderId &&
          document.hasFocus()
        ) {
          setTimeout(() => {
            socket.emit("messageSeen", {
              messageId: newMessage._id,
              userId: authUser._id,
            })
            console.log("✅ Auto-marked message as seen in active chat")
          }, 500)
        }
      }
    })

    // Delivered tick ✅✅
    socket.on("messageDelivered", ({ messageId, userId }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId && !msg.deliveredTo?.includes(userId)
            ? {
                ...msg,
                deliveredTo: [...(msg.deliveredTo || []), userId],
              }
            : msg,
        ),
      }))
    })

    // Seen tick ✅✅ blue
    socket.on("messageSeen", ({ messageId, seenBy, seenAt }) => {
      console.log("Received messageSeen event:", messageId, seenBy)
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId && !msg.seenBy?.includes(seenBy)
            ? {
                ...msg,
                seenBy: [...(msg.seenBy || []), seenBy],
                seenAt,
              }
            : msg,
        ),
      }))
    })
  },

  unsubscribeFromMessages: () => {
    const { socket } = useAuthStore.getState()
    if (!socket) return

    // Only remove chat-specific listeners, keep global delivery listener
    socket.off("messageDelivered")
    socket.off("messageSeen")
  },

  setSelectedUser: (selectedUser) => {
    const prevSelectedUser = get().selectedUser
    set({ selectedUser })

    // Only mark messages as seen if we're switching to a different user
    if (!prevSelectedUser || prevSelectedUser._id !== selectedUser?._id) {
      const { socket } = useAuthStore.getState()
      const { authUser } = useAuthStore.getState()
      const { messages } = get()

      if (socket && selectedUser && authUser) {
        // Small delay to ensure messages are loaded
        setTimeout(() => {
          const currentMessages = get().messages
          const unseenMessages = currentMessages.filter(
            (msg) =>
              msg.senderId === selectedUser._id &&
              msg.receiverId === authUser._id &&
              !msg.seenBy?.includes(authUser._id),
          )

          console.log(`Marking ${unseenMessages.length} messages as seen when selecting user`)
          unseenMessages.forEach((msg) => {
            socket.emit("messageSeen", {
              messageId: msg._id,
              userId: authUser._id,
            })
          })
        }, 100)
      }
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}`)
      const { messages } = get()
      set({ messages: messages.filter((msg) => msg._id !== messageId) })
    } catch (error) {
      toast.error("Failed to delete message")
    }
  },

  editMessage: async (messageId, newText) => {
    try {
      const res = await axiosInstance.put(`/messages/${messageId}`, { text: newText })
      const { messages } = get()
      set({
        messages: messages.map((msg) => (msg._id === messageId ? { ...msg, text: newText, edited: true } : msg)),
      })
    } catch (error) {
      toast.error("Failed to edit message")
    }
  },
}))



