import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDoc,
  doc,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { Send, PhotoCamera, CloudUpload, Videocam } from "@mui/icons-material";

export default function ChatRoom() {
  const { pairId } = useParams();
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const bottomRef = useRef(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoCameraRef = useRef(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const userDoc = await getDoc(doc(db, "users", u.uid));
        if (userDoc.exists()) setUserEmail(userDoc.data().email);
      } else {
        setUser(null);
      }
    });

    const q = query(
      collection(db, "chats", pairId, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsubMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setLoading(false);
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        100
      );
    });

    return () => {
      unsubAuth();
      unsubMessages();
    };
  }, [pairId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!user) return alert("⚠️ Please log in first.");

    await addDoc(collection(db, "chats", pairId, "messages"), {
      senderId: user.uid,
      senderEmail: userEmail || user.email,
      text: newMessage,
      type: "text",
      timestamp: serverTimestamp(),
    });
    setNewMessage("");
  };

  const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.6) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          } else if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const base64 = canvas.toDataURL("image/jpeg", quality);
          resolve(base64);
        };
      };
      reader.readAsDataURL(file);
    });

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!user) return alert("⚠️ Please log in first.");

    const fileType = file.type.split("/")[0];

    try {
      if (fileType === "image") {
        const base64 = await compressImage(file);
        await addDoc(collection(db, "chats", pairId, "messages"), {
          senderId: user.uid,
          senderEmail: userEmail || user.email,
          image: base64,
          type: "image",
          timestamp: serverTimestamp(),
        });
      } else if (fileType === "video") {
        if (file.size > 900000) {
          alert("⚠️ Video is too large! Keep it under 1MB.");
          return;
        }
        const reader = new FileReader();
        reader.onloadend = async () => {
          await addDoc(collection(db, "chats", pairId, "messages"), {
            senderId: user.uid,
            senderEmail: userEmail || user.email,
            video: reader.result,
            type: "video",
            timestamp: serverTimestamp(),
          });
        };
        reader.readAsDataURL(file);
      } else {
        alert("⚠️ Only image and video files are supported.");
      }
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const date = ts.toDate();
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        p: 2,
        background: "linear-gradient(135deg, #c9e4ff 0%, #e0f7fa 100%)",
      }}
    >
      {/* Messages Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          mb: 1,
          px: 1,
        }}
      >
        {messages.map((msg) => (
          <Box
            key={msg.id}
            sx={{
              display: "flex",
              justifyContent: msg.senderId === user?.uid ? "flex-end" : "flex-start",
              mb: 1.5,
            }}
          >
            <Box
              sx={{
                background: msg.senderId === user?.uid ? "#0078ff" : "#e6e6e6",
                color: msg.senderId === user?.uid ? "white" : "black",
                borderRadius: "15px",
                p: 1,
                maxWidth: "70%",
                wordWrap: "break-word",
              }}
            >
              {msg.type === "image" ? (
                <img
                  src={msg.image}
                  alt="sent"
                  style={{ maxWidth: "100%", borderRadius: 10 }}
                />
              ) : msg.type === "video" ? (
                <video
                  src={msg.video}
                  controls
                  style={{ maxWidth: "100%", borderRadius: 10 }}
                />
              ) : (
                <Typography sx={{ fontSize: 14 }}>{msg.text}</Typography>
              )}
            </Box>
          </Box>
        ))}
        <div ref={bottomRef} />
      </Box>

      {/* Input + icons */}
      <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
        <TextField
          fullWidth
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          size="small"
        />

        <input
          type="file"
          accept="image/*,video/*"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
        <IconButton size="small" onClick={() => fileInputRef.current.click()}>
          <CloudUpload fontSize="small" />
        </IconButton>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={cameraInputRef}
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
        <IconButton size="small" onClick={() => cameraInputRef.current.click()}>
          <PhotoCamera fontSize="small" />
        </IconButton>

        <input
          type="file"
          accept="video/*"
          capture="camcorder"
          ref={videoCameraRef}
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
        <IconButton size="small" onClick={() => videoCameraRef.current.click()}>
          <Videocam fontSize="small" />
        </IconButton>

        <Button
          variant="contained"
          sx={{ minWidth: "50px", py: 0.7 }}
          onClick={sendMessage}
        >
          <Send fontSize="small" />
        </Button>
      </Box>
    </Box>
  );
}
