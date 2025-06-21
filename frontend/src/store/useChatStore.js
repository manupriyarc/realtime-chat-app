// import { create } from "zustand";
// import toast from "react-hot-toast";
// import { axiosInstance } from "../lib/axios";
// import { useAuthStore } from "./useAuthStore";
// import { Socket } from "../lib/socket"; 

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

  


//   // sendMessage: async (messageData) => {
//   //   const { selectedUser, messages } = get();
//   //   try {
//   //     const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
//   //     set({ messages: [...messages, res.data] });
//   //   } catch (error) {
//   //     toast.error(error.response.data.message);
//   //   }
//   // },

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
toast.error(error?.response?.data?.message || "Failed to load users");
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
toast.error(error?.response?.data?.message || "Failed to load messages");
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
      image: messageData.image, // base64 string
    });
    imageUrl = uploadRes.data.url;
  }

  const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, {
    text: messageData.text,
    image: imageUrl,
  });

  set({ messages: [...messages, res.data] });
} catch (error) {
  toast.error(error?.response?.data?.message || "Failed to send message");
}
},

subscribeToMessages: () => {
const socket = useAuthStore.getState().socket;
const { selectedUser } = get();
if (!selectedUser) return;
socket.on("newMessage", (newMessage) => {
  const isFromSelectedUser = newMessage.senderId === selectedUser._id;
  if (!isFromSelectedUser) return;

  set((state) => ({
    messages: [...state.messages, newMessage],
  }));
});

socket.on("messagesSeen", ({ senderId }) => {
  get().updateMessageStatuses(senderId, "seen");
});
},

unsubscribeFromMessages: () => {
const socket = useAuthStore.getState().socket;
socket.off("newMessage");
socket.off("messagesSeen");
},

setSelectedUser: (selectedUser) => set({ selectedUser }),

updateMessageStatuses: (senderId, newStatus) => {
set((state) => {
const updatedMessages = state.messages.map((msg) =>
msg.senderId === senderId ? { ...msg, status: newStatus } : msg
);
return { messages: updatedMessages };
});
},
}));