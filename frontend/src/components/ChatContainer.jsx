"use client"

import { useChatStore } from "../store/useChatStore"
import { useEffect, useRef, useState } from "react"
import { useAuthStore } from "../store/useAuthStore"

import ChatHeader from "./ChatHeader"
import MessageInput from "./MessageInput"
import MessageSkeleton from "./skeletons/MessageSkeleton"
import { formatMessageTime } from "../lib/utils"
import { X, Pencil } from "lucide-react"

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
  } = useChatStore()

  const { authUser, socket } = useAuthStore()
  const messageEndRef = useRef(null)
  const [typingUser, setTypingUser] = useState(null)

  useEffect(() => {
    if (!selectedUser) return

    getMessages(selectedUser._id)
    subscribeToMessages()

    if (socket) {
      socket.on("typing", ({ from }) => {
        if (from === selectedUser._id) {
          setTypingUser(selectedUser.username)
          setTimeout(() => setTypingUser(null), 1500)
        }
      })
    }

    return () => {
      unsubscribeFromMessages()
      socket?.off("typing")
    }
  }, [selectedUser])

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Mark messages as seen when they are loaded or when user is viewing them
  useEffect(() => {
    if (!selectedUser || !socket || !authUser || !messages.length) return

    // Find messages that need to be marked as seen
    const unseenMessages = messages.filter(
      (msg) =>
        msg.senderId === selectedUser._id && // Message is from the selected user
        msg.receiverId === authUser._id && // Message is to current user
        !msg.seenBy?.includes(authUser._id), // Current user hasn't seen it yet
    )

    if (unseenMessages.length > 0) {
      console.log(`Marking ${unseenMessages.length} messages as seen`)

      // Mark each unseen message as seen
      unseenMessages.forEach((msg) => {
        socket.emit("messageSeen", {
          messageId: msg._id,
          userId: authUser._id,
        })
      })
    }
  }, [messages, selectedUser, socket, authUser])

  // Also mark messages as seen when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (!selectedUser || !socket || !authUser || !messages.length) return

      const unseenMessages = messages.filter(
        (msg) =>
          msg.senderId === selectedUser._id && msg.receiverId === authUser._id && !msg.seenBy?.includes(authUser._id),
      )

      if (unseenMessages.length > 0) {
        console.log(`Marking ${unseenMessages.length} messages as seen on focus`)
        unseenMessages.forEach((msg) => {
          socket.emit("messageSeen", {
            messageId: msg._id,
            userId: authUser._id,
          })
        })
      }
    }

    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [messages, selectedUser, socket, authUser])

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(messageId)
    } catch (error) {
      console.error("Failed to delete message:", error)
    }
  }

  const handleEditMessage = async (messageId, oldText) => {
    const newText = prompt("Edit message:", oldText)
    if (newText && newText !== oldText) {
      try {
        await editMessage(messageId, newText)
      } catch (error) {
        console.error("Failed to edit message:", error)
      }
    }
  }

  const getSeenStatus = (message) => {
    const isSender = message.senderId === authUser._id
    if (!isSender) return null

    const seenBy = message.seenBy ?? []
    const deliveredTo = message.deliveredTo ?? []

    const isSeen = seenBy.includes(selectedUser?._id)
    const isDelivered = deliveredTo.includes(selectedUser?._id)

    if (isSeen) {
      const time = message.seenAt
        ? new Date(message.seenAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Unknown time"

      return (
        <span className="text-blue-500 text-xs font-bold" title={`Seen at ${time}`}>
          ✓✓
        </span>
      )
    }

    if (isDelivered) {
      return (
        <span className="text-gray-500 text-xs font-bold" title="Delivered">
          ✓✓
        </span>
      )
    }

    return (
      <span className="text-gray-400 text-xs" title="Sent">
        ✓
      </span>
    )
  }

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, i) => {
          const isSelf = message.senderId === authUser._id

          return (
            <div
              key={message._id}
              className={`chat ${isSelf ? "chat-end" : "chat-start"}`}
              ref={messages.length - 1 === i ? messageEndRef : null}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={isSelf ? authUser.profilePic || "/avatar.png" : selectedUser?.profilePic || "/avatar.png"}
                    alt="profile pic"
                  />
                </div>
              </div>

              <div className="chat-header mb-1">
                <span className="text-sm font-medium">{isSelf ? "You" : selectedUser?.username}</span>
                <time className="text-xs opacity-50 ml-1">{formatMessageTime(message.createdAt)}</time>
                {message.edited && <span className="text-xs opacity-50 ml-1">(edited)</span>}
              </div>

              <div className="chat-bubble flex flex-col max-w-xs sm:max-w-md relative group">
                {message.image && (
                  <img src={message.image || "/placeholder.svg"} alt="Image" className="rounded-md mb-2 max-w-60" />
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

                {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}

                {isSelf && (
                  <>
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

                    <div className="text-right text-xs mt-1 flex justify-end items-center gap-1">
                      <span className="text-gray-500">{formatMessageTime(message.createdAt)}</span>
                      {getSeenStatus(message)}
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}

        {typingUser && (
          <div className="chat chat-start">
            <div className="chat-bubble text-sm text-zinc-400 animate-pulse">{typingUser} is typing...</div>
          </div>
        )}
      </div>

      <MessageInput />
    </div>
  )
}

export default ChatContainer
