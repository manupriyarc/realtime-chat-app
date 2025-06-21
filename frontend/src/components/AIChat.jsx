import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const AIChat = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [botTyping, setBotTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Scroll to bottom on new messages or typing indicator
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botTyping]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setBotTyping(true);

    try {
      const res = await axios.post(
        "http://localhost:5001/api/chatbot",
        { message: input },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          withCredentials: true,
        }
      );

      setBotTyping(false);

      const botMessage = { sender: "bot", text: res.data.reply };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      setBotTyping(false);
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Sorry, something went wrong." },
      ]);
    }
  };

  // Typing dots animation style + jsx
  const TypingDots = () => (
    <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
      {[...Array(3)].map((_, i) => (
        <span
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "#666",
            display: "inline-block",
            animation: `bounce 1.4s infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );

  return (
    <div
      style={{
        maxWidth: 1000,
        height: "80vh",
        margin: "70px auto",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        borderRadius: 16,
        boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
        backgroundColor: "#fafafa",
        fontFamily:
          "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          marginBottom: 20,
          fontWeight: "700",
          color: "#222",
          fontSize: 28,
        }}
      >
        AI Chatbot
      </h2>

      <div
        style={{
          flexGrow: 1,
          overflowY: "auto",
          padding: 16,
          borderRadius: 16,
          backgroundColor: "#fff",
          boxShadow: "inset 0 0 15px #eee",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          scrollbarWidth: "thin",
        }}
      >
        {messages.map((msg, idx) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={idx}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "70%",
                padding: "12px 18px",
                borderRadius: 24,
                background: isUser
                  ? "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
                  : "#f1f3f5",
                color: isUser ? "white" : "#222",
                boxShadow: isUser
                  ? "0 4px 12px rgba(0, 127, 255, 0.4)"
                  : "0 2px 8px rgba(0,0,0,0.06)",
                fontSize: 16,
                lineHeight: 1.4,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                userSelect: "text",
              }}
            >
              {msg.text}
            </div>
          );
        })}

        {botTyping && (
          <div
            style={{
              alignSelf: "flex-start",
              display: "flex",
              alignItems: "center",
              padding: "12px 18px",
              borderRadius: 24,
              backgroundColor: "#f1f3f5",
              color: "#444",
              fontSize: 16,
              fontWeight: "600",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            Typing
            <TypingDots />
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          gap: 12,
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          style={{
            flexGrow: 1,
            padding: "14px 20px",
            borderRadius: 30,
            border: "1.5px solid #ddd",
            fontSize: 16,
            outline: "none",
            transition: "border-color 0.2s",
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
          }}
          autoFocus
          onFocus={(e) => (e.target.style.borderColor = "#4facfe")}
          onBlur={(e) => (e.target.style.borderColor = "#ddd")}
        />

        <button
          onClick={sendMessage}
          style={{
            padding: "14px 28px",
            borderRadius: 30,
            border: "none",
            background:
              "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
            color: "white",
            fontWeight: "700",
            fontSize: 16,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,127,255,0.4)",
            transition: "background 0.3s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background =
              "linear-gradient(135deg, #00a3ff 0%, #00d9ff 100%)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background =
              "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)")
          }
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default AIChat;
