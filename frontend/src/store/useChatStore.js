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
import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch users.");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch messages.");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      let imageUrl = "";

      if (messageData.image) {
        const uploadRes = await axiosInstance.post("/messages/upload", {
          image: messageData.image,
        });
        imageUrl = uploadRes.data.url;
      }

      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, {
        text: messageData.text,
        image: imageUrl,
      });

      set({ messages: [...messages, res.data] });
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to send message.";
      toast.error(message);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    const { authUser, socket } = useAuthStore.getState();
    if (!selectedUser || !socket) return;

    socket.on("newMessage", (newMessage) => {
      const { selectedUser: currentSelectedUser } = get();

      if (
        currentSelectedUser &&
        ((newMessage.senderId === currentSelectedUser._id && newMessage.receiverId === authUser._id) ||
          (newMessage.senderId === authUser._id && newMessage.receiverId === currentSelectedUser._id))
      ) {
        const { messages } = get();
        set({ messages: [...messages, newMessage] });

        if (
          newMessage.receiverId === authUser._id &&
          currentSelectedUser._id === newMessage.senderId &&
          document.hasFocus()
        ) {
          setTimeout(() => {
            socket.emit("messageSeen", {
              messageId: newMessage._id,
              userId: authUser._id,
            });
          }, 500);
        }
      }
    });

    socket.on("messageDelivered", ({ messageId, userId }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId && !msg.deliveredTo?.includes(userId)
            ? {
                ...msg,
                deliveredTo: [...(msg.deliveredTo || []), userId],
              }
            : msg
        ),
      }));
    });

    socket.on("messageSeen", ({ messageId, seenBy, seenAt }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId && !msg.seenBy?.includes(seenBy)
            ? {
                ...msg,
                seenBy: [...(msg.seenBy || []), seenBy],
                seenAt,
              }
            : msg
        ),
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const { socket } = useAuthStore.getState();
    if (!socket) return;
    socket.off("messageDelivered");
    socket.off("messageSeen");
  },

  setSelectedUser: (selectedUser) => {
    const prevSelectedUser = get().selectedUser;
    set({ selectedUser });

    if (!prevSelectedUser || prevSelectedUser._id !== selectedUser?._id) {
      const { socket, authUser } = useAuthStore.getState();

      if (socket && selectedUser && authUser) {
        setTimeout(() => {
          const currentMessages = get().messages;
          const unseenMessages = currentMessages.filter(
            (msg) =>
              msg.senderId === selectedUser._id &&
              msg.receiverId === authUser._id &&
              !msg.seenBy?.includes(authUser._id)
          );

          unseenMessages.forEach((msg) => {
            socket.emit("messageSeen", {
              messageId: msg._id,
              userId: authUser._id,
            });
          });
        }, 100);
      }
    }
  },

  // ✅ Delete Message
  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}`);
      const { messages } = get();
      set({ messages: messages.filter((msg) => msg._id !== messageId) });
      toast.success("Message deleted");
    } catch (error) {
      toast.error("Failed to delete message");
    }
  },

  // ✅ Edit Message
  editMessage: async (messageId, newText) => {
    try {
      const res = await axiosInstance.put(`/messages/edit/${messageId}`, { text: newText });
      const { messages } = get();
      set({
        messages: messages.map((msg) =>
          msg._id === messageId ? { ...msg, text: res.data.text, edited: true } : msg
        ),
      });
      toast.success("Message edited");
    } catch (error) {
      toast.error("Failed to edit message");
    }
  },
}));



