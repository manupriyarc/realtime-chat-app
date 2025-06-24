// import { useRef, useState } from "react";
// import { useChatStore } from "../store/useChatStore";
// import { Image, Send, X } from "lucide-react";
// import toast from "react-hot-toast";

// const MessageInput = () => {
//   const [text, setText] = useState("");
//   const [imagePreview, setImagePreview] = useState(null);
//   const fileInputRef = useRef(null);
//   const { sendMessage } = useChatStore();

//   const handleImageChange = (e) => {
//     const file = e.target.files[0];
//     if (!file.type.startsWith("image/")) {
//       toast.error("Please select an image file");
//       return;
//     }

//     const reader = new FileReader();
//     reader.onloadend = () => {
//       setImagePreview(reader.result);
//     };
//     reader.readAsDataURL(file);
//   };

//   const removeImage = () => {
//     setImagePreview(null);
//     if (fileInputRef.current) fileInputRef.current.value = "";
//   };

//   const handleSendMessage = async (e) => {
//     e.preventDefault();
//     if (!text.trim() && !imagePreview) return;

//     try {
//       await sendMessage({
//         text: text.trim(),
//         image: imagePreview,
//       });

//       // Clear form
//       setText("");
//       setImagePreview(null);
//       if (fileInputRef.current) fileInputRef.current.value = "";
//     } catch (error) {
//       console.error("Failed to send message:", error);
//     }
//   };

//   return (
//     <div className="p-4 w-full">
//       {imagePreview && (
//         <div className="mb-3 flex items-center gap-2">
//           <div className="relative">
//             <img
//               src={imagePreview}
//               alt="Preview"
//               className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
//             />
//             <button
//               onClick={removeImage}
//               className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
//               flex items-center justify-center"
//               type="button"
//             >
//               <X className="size-3" />
//             </button>
//           </div>
//         </div>
//       )}

//       <form onSubmit={handleSendMessage} className="flex items-center gap-2">
//         <div className="flex-1 flex gap-2">
//           <input
//             type="text"
//             className="w-full input input-bordered rounded-lg input-sm sm:input-md"
//             placeholder="Type a message..."
//             value={text}
//             onChange={(e) => setText(e.target.value)}
//           />
//           <input
//             type="file"
//             accept="image/*"
//             className="hidden"
//             ref={fileInputRef}
//             onChange={handleImageChange}
//           />

//           <button
//             type="button"
//             className={`hidden sm:flex btn btn-circle
//                      ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
//             onClick={() => fileInputRef.current?.click()}
//           >
//             <Image size={20} />
//           </button>
//         </div>
//         <button
//           type="submit"
//           className="btn btn-sm btn-circle"
//           disabled={!text.trim() && !imagePreview}
//         >
//           <Send size={22} />
//         </button>
//       </form>
//     </div>
//   );
// };
// export default MessageInput;


//New Added

// import { useRef, useState } from "react";
// import { useChatStore } from "../store/useChatStore";
// import { Image, Send, X } from "lucide-react";
// import toast from "react-hot-toast";

// const MessageInput = () => {
//   const [text, setText] = useState("");
//   const [imagePreview, setImagePreview] = useState(null);
//   const fileInputRef = useRef(null);
//   const { sendMessage, sendToAI } = useChatStore();

//   const handleImageChange = (e) => {
//     const file = e.target.files[0];
//     if (!file.type.startsWith("image/")) {
//       toast.error("Please select an image file");
//       return;
//     }

//     const reader = new FileReader();
//     reader.onloadend = () => {
//       setImagePreview(reader.result);
//     };
//     reader.readAsDataURL(file);
//   };

//   const removeImage = () => {
//     setImagePreview(null);
//     if (fileInputRef.current) fileInputRef.current.value = "";
//   };

//   const handleSendMessage = async (e) => {
//     e.preventDefault();
//     if (!text.trim() && !imagePreview) return;

//     try {
//       // Send user's message normally
//       await sendMessage({
//         text: text.trim(),
//         image: imagePreview,
//       });

//       // Clear inputs first
//       setText("");
//       setImagePreview(null);
//       if (fileInputRef.current) fileInputRef.current.value = "";

//       // If no image, send prompt to AI
//       if (text.trim() && !imagePreview) {
//         const aiReply = await sendToAI(text.trim());
//         if (aiReply) {
//           // Send AI reply as message from "AI"
//           await sendMessage({
//             text: aiReply,
//             // Optional: you can add a special senderId like "AI" here
//           });
//         }
//       }
//     } catch (error) {
//       console.error("Failed to send message:", error);
//     }
//   };

//   return (
//     <div className="p-4 w-full">
//       {imagePreview && (
//         <div className="mb-3 flex items-center gap-2">
//           <div className="relative">
//             <img
//               src={imagePreview}
//               alt="Preview"
//               className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
//             />
//             <button
//               onClick={removeImage}
//               className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
//               flex items-center justify-center"
//               type="button"
//             >
//               <X className="size-3" />
//             </button>
//           </div>
//         </div>
//       )}

//       <form onSubmit={handleSendMessage} className="flex items-center gap-2">
//         <div className="flex-1 flex gap-2">
//           <input
//             type="text"
//             className="w-full input input-bordered rounded-lg input-sm sm:input-md"
//             placeholder="Type a message..."
//             value={text}
//             onChange={(e) => setText(e.target.value)}
//           />
//           <input
//             type="file"
//             accept="image/*"
//             className="hidden"
//             ref={fileInputRef}
//             onChange={handleImageChange}
//           />

//           <button
//             type="button"
//             className={`hidden sm:flex btn btn-circle
//                      ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
//             onClick={() => fileInputRef.current?.click()}
//           >
//             <Image size={20} />
//           </button>
//         </div>
//         <button
//           type="submit"
//           className="btn btn-sm btn-circle"
//           disabled={!text.trim() && !imagePreview}
//         >
//           <Send size={22} />
//         </button>
//       </form>
//     </div>
//   );
// };
// export default MessageInput;

"use client"

import { useRef, useState } from "react"
import { useChatStore } from "../store/useChatStore"
import { ImageIcon, Send, X, Smile } from "lucide-react"
import EmojiPicker from "emoji-picker-react"
import toast from "react-hot-toast"

const MessageInput = () => {
  const [text, setText] = useState("")
  const [imagePreview, setImagePreview] = useState(null)
  const [file, setFile] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const fileInputRef = useRef(null)
  const { sendMessage } = useChatStore()

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
        setFile(null)
      }
      reader.readAsDataURL(selectedFile)
    } else {
      setFile(selectedFile)
      setImagePreview(null)
    }
  }

  const removePreview = () => {
    setImagePreview(null)
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!text.trim() && !imagePreview && !file) return

    try {
      await sendMessage({ text, image: imagePreview, file })
      setText("")
      removePreview()
    } catch (error) {
      toast.error("Failed to send message")
      console.error(error)
    }
  }

  return (
    <div className="p-4 w-full">
      {(imagePreview || file) && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            {imagePreview ? (
              <img
                src={imagePreview || "/placeholder.svg"}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
              />
            ) : (
              <div className="flex items-center gap-2 p-2 bg-base-200 rounded-lg">
                <div className="w-8 h-8 bg-base-300 rounded flex items-center justify-center">
                  <span className="text-xs font-medium">{file?.name?.split(".").pop()?.toUpperCase() || "FILE"}</span>
                </div>
                <span className="text-sm text-zinc-500 truncate max-w-32">{file?.name}</span>
              </div>
            )}
            <button
              onClick={removePreview}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2 items-center relative">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`btn btn-circle ${imagePreview ? "text-emerald-500" : "text-zinc-500"}`}
            title="Upload image or file"
          >
            <ImageIcon size={20} />
          </button>

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="btn btn-circle text-zinc-500"
            title="Add emoji"
          >
            <Smile size={20} />
          </button>

          {showEmojiPicker && (
            <div className="absolute bottom-12 right-0 z-50">
              <EmojiPicker
                onEmojiClick={(e) => {
                  setText((prev) => prev + e.emoji)
                  setShowEmojiPicker(false)
                }}
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview && !file}
          title="Send message"
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  )
}

export default MessageInput