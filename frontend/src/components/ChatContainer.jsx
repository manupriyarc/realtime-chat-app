// import { useChatStore } from "../store/useChatStore";
// import { useEffect, useRef } from "react";
// import { useAuthStore } from "../store/useAuthStore";

// import ChatHeader from "./ChatHeader";
// import MessageInput from "./MessageInput";
// import MessageSkeleton from "./skeletons/MessageSkeleton";
// import { useAuthStore } from "../store/useAuthStore";
// import { formatMessageTime } from "../lib/utils";

// const ChatContainer = () => {
//   const {
//     messages,
//     getMessages,
//     isMessagesLoading,
//     selectedUser,
//     subscribeToMessages,
//     unsubscribeFromMessages,
//   } = useChatStore();
//   const { authUser } = useAuthStore();
//   const messageEndRef = useRef(null);

//   useEffect(() => {
//     getMessages(selectedUser._id);

//     subscribeToMessages();

//     return () => unsubscribeFromMessages();
//   }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

//   useEffect(() => {
//     if (messageEndRef.current && messages) {
//       messageEndRef.current.scrollIntoView({ behavior: "smooth" });
//     }
//   }, [messages]);

//   if (isMessagesLoading) {
//     return (
//       <div className="flex-1 flex flex-col overflow-auto">
//         <ChatHeader />
//         <MessageSkeleton />
//         <MessageInput />
//       </div>
//     );
//   }

//   return (
//     <div className="flex-1 flex flex-col overflow-auto">
//       <ChatHeader />

//       <div className="flex-1 overflow-y-auto p-4 space-y-4">
//         {messages.map((message) => (
//           <div
//             key={message._id}
//             className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
//             ref={messageEndRef}
//           >
//             <div className=" chat-image avatar">
//               <div className="size-10 rounded-full border">
//                 <img
//                   src={
//                     message.senderId === authUser._id
//                       ? authUser.profilePic || "/avatar.png"
//                       : selectedUser.profilePic || "/avatar.png"
//                   }
//                   alt="profile pic"
//                 />
//               </div>
//             </div>
//             <div className="chat-header mb-1">
//               <time className="text-xs opacity-50 ml-1">
//                 {formatMessageTime(message.createdAt)}
//               </time>
//             </div>
//             <div className="chat-bubble flex flex-col">
//               {message.image && (
//                 <img
//                   src={message.image}
//                   alt="Attachment"
//                   className="sm:max-w-[200px] rounded-md mb-2"
//                 />
//               )}
//               {message.text && <p>{message.text}</p>}
//             </div>
//           </div>
//         ))}
//       </div>

//       <MessageInput />
//     </div>
//   );
// };
// export default ChatContainer;

import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { formatMessageTime } from "../lib/utils";
import { X, Pencil } from "lucide-react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteMessage,
    editMessage,
  } = useChatStore();

  const { authUser, socket } = useAuthStore();

  const messageEndRef = useRef(null);
  const [typingUser, setTypingUser] = useState(null);

  useEffect(() => {
    if (!selectedUser) return;

    getMessages(selectedUser._id);
    subscribeToMessages();

    if (socket) {
      socket.on("typing", ({ from }) => {
        if (from === selectedUser._id) {
          setTypingUser(selectedUser.username);
          setTimeout(() => setTypingUser(null), 1500);
        }
      });
    }

    return () => {
      unsubscribeFromMessages();
      socket?.off("typing");
    };
  }, [selectedUser]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const handleEditMessage = async (messageId, oldText) => {
    const newText = prompt("Edit message:", oldText);
    if (newText && newText !== oldText) {
      try {
        await editMessage(messageId, newText);
      } catch (error) {
        console.error("Failed to edit message:", error);
      }
    }
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isSelf = message.senderId === authUser._id;

          return (
            <div
              key={message._id}
              className={`chat ${isSelf ? "chat-end" : "chat-start"}`}
              ref={messageEndRef}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={
                      isSelf
                        ? authUser.profilePic || "/avatar.png"
                        : selectedUser.profilePic || "/avatar.png"
                    }
                    alt="profile pic"
                  />
                </div>
              </div>

              <div className="chat-header mb-1">
                <span className="text-sm font-medium">
                  {isSelf ? "You" : selectedUser.username}
                </span>
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>

              <div className="chat-bubble flex flex-col max-w-xs sm:max-w-md relative group">
                {message.image && (
                  <img
                    src={message.image}
                    alt="Image"
                    className="rounded-md mb-2 max-w-60"
                  />
                )}

                {message.file && (
                  <a
                    href={message.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline break-words mb-2"
                  >
                    {message.fileName || "Download file"}
                  </a>
                )}

                {message.text && (
                  <p className="whitespace-pre-wrap">{message.text}</p>
                )}

                {isSelf && (
                  <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-1">
                    <button
                      onClick={() => handleEditMessage(message._id, message.text)}
                      className="btn btn-xs btn-circle text-zinc-500 hover:text-blue-500"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(message._id)}
                      className="btn btn-xs btn-circle text-zinc-500 hover:text-red-500"
                    >
                    <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {typingUser && (
          <div className="chat chat-start">
            <div className="chat-bubble text-sm text-zinc-400 animate-pulse">
              {typingUser} is typing...
            </div>
          </div>
        )}
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
