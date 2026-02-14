import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { sendNotification } from "../utils/sendNotification";

import { onAuthStateChanged } from "firebase/auth";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  IconButton,
  AppBar,
  Toolbar,
  Avatar,
  Paper,
} from "@mui/material";
import { Send, PhotoCamera, CloudUpload, Videocam, ArrowBack } from "@mui/icons-material";
import ReportIcon from "@mui/icons-material/Report";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { REPORT_REASONS } from "../constants/reportReasons";




export default function ChatRoom() {
  const { pairId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const bottomRef = useRef(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoCameraRef = useRef(null);
  const [reportOpen, setReportOpen] = useState(false);
const [reportReason, setReportReason] = useState("");
const [reportText, setReportText] = useState("");
const GLASS_BG = "rgba(255,255,255,0.06)";
const GLASS_BORDER = "1px solid rgba(255,255,255,0.12)";
const GLASS_BLUR = "blur(14px) saturate(160%)";
const PAGE_BG = "linear-gradient(180deg, #063149ff 0%, #7aa5dfff 100%)";


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

  // fetch partner email for header display
  useEffect(() => {
    if (!pairId || !auth.currentUser) return;
    const ids = pairId.split("_");
    const partnerId = ids.find((id) => id !== auth.currentUser?.uid);
    if (!partnerId) return;
    (async () => {
      try {
        const pDoc = await getDoc(doc(db, "users", partnerId));
        if (pDoc.exists()) setPartnerEmail(pDoc.data().email || partnerId);
        else setPartnerEmail(partnerId);
      } catch (e) {
        setPartnerEmail(partnerId);
      }
    })();
  }, [pairId, user]);

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
    const ids = pairId.split("_");
const receiverId = ids.find((id) => id !== user.uid);

await sendNotification(
  receiverId,
  auth.currentUser.uid,
  userEmail.split("@")[0],
  "sent you a message",
  "chat"
);


  };
  const submitReport = async () => {
  if (!reportReason || !user) return;

  const ids = pairId.split("_");
  const reportedUserId = ids.find((id) => id !== user.uid);

  await addDoc(collection(db, "reports"), {
    reporterId: user.uid,
    reporterEmail: userEmail,
    reporterRole: "unknown", // resolved by admin if needed
    reportedUserId,
    reason: reportReason,
    description: reportText,
    pairId,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  alert("✅ Report submitted. SuperBird will review it.");
  setReportOpen(false);
  setReportReason("");
  setReportText("");
  await sendNotification(
  "superbird21@gmail.com",
   auth.currentUser.uid,
  userEmail.split("@")[0],
  "submitted a report",
  "report"
);

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
      // ✅ NEW FILE SUPPORT
      const reader = new FileReader();
      reader.onloadend = async () => {
        await addDoc(collection(db, "chats", pairId, "messages"), {
          senderId: user.uid,
          senderEmail: userEmail || user.email,
          file: reader.result,
          fileName: file.name,
          type: "file",
          timestamp: serverTimestamp(),
        });
      };
      reader.readAsDataURL(file);
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
    background: PAGE_BG,
  }}
>
      <AppBar
  position="sticky"
  elevation={0}
  sx={{
    background: GLASS_BG,
    backdropFilter: GLASS_BLUR,
    borderBottom: GLASS_BORDER,
  }}
>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate(-1)}>
            <ArrowBack />
          </IconButton>
          <Avatar sx={{ width: 36, height: 36, mr: 1, bgcolor: "secondary.main" }}>
            {partnerEmail ? partnerEmail.charAt(0).toUpperCase() : "B"}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ color: "#EAF0FF", fontWeight: 800 }}>{partnerEmail || "Chat"}</Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>Open conversation</Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2,
          background: "transparent",
        }}
      >
        {messages.map((msg) => (
          <Box
            key={msg.id}
            sx={{ display: "flex", mb: 1.5, alignItems: "flex-end", gap: 1 }}
          >
            {msg.senderId !== user?.uid && (
              <Avatar sx={{ bgcolor: "primary.light", width: 36, height: 36 }}>
                {msg.senderEmail ? msg.senderEmail.charAt(0).toUpperCase() : "U"}
              </Avatar>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", alignItems: msg.senderId === user?.uid ? "flex-end" : "flex-start", width: "100%" }}>
              <Paper
                elevation={0}
                sx={{
                  background:
  msg.senderId === user?.uid
    ? "linear-gradient(135deg, rgba(155,140,255,0.9), rgba(120,110,255,0.85))"
    : GLASS_BG,
backdropFilter: GLASS_BLUR,
border: GLASS_BORDER,
color: "#EAF0FF",
                  color: msg.senderId === user?.uid ? "#fff" : "#111",
                  borderRadius: 2,
                  px: 1.2,
                  py: 0.8,
                  maxWidth: "78%",
                  boxShadow: msg.senderId === user?.uid ? "0 2px 8px rgba(30,64,175,0.12)" : "none",
                }}
              >
               {msg.type === "image" ? (
  <img src={msg.image} style={{ maxWidth: "100%", borderRadius: 8 }} />

) : msg.type === "video" ? (
  <video src={msg.video} controls style={{ maxWidth: "100%", borderRadius: 8 }} />

) : msg.type === "file" ? (
  <a
    href={msg.file}
    target="_blank"
    rel="noopener noreferrer"
    style={{ color: "#1976d2", fontWeight: "bold" }}
  >
    📎 {msg.fileName}
  </a>

) : (
  <Typography sx={{ fontSize: 14, whiteSpace: "pre-wrap" }}>
    {msg.text}
  </Typography>

                )}
              </Paper>

              <Typography variant="caption" sx={{ mt: 0.5, color: "rgba(255,255,255,0.6)" }}>
                {msg.senderEmail ? msg.senderEmail : ""} • {formatTime(msg.timestamp)}
              </Typography>
            </Box>

            {msg.senderId === user?.uid && (
              <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36 }}>
                {msg.senderEmail ? msg.senderEmail.charAt(0).toUpperCase() : "M"}
              </Avatar>
            )}
          </Box>
        ))}
        <div ref={bottomRef} />
      </Box>

      <Paper
  elevation={0}
  sx={{
    p: 1.25,
    position: "sticky",
    bottom: 0,
    background: GLASS_BG,
    backdropFilter: GLASS_BLUR,
    borderTop: GLASS_BORDER,
  }}
>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          <TextField
  fullWidth
  placeholder="Type a message..."
  value={newMessage}
  onChange={(e) => setNewMessage(e.target.value)}
  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
  size="small"
  sx={{
    input: { color: "#EAF0FF" },
    bgcolor: "rgba(255,255,255,0.04)",
    borderRadius: 2,
    "& fieldset": { border: "none" },
  }}
/>

          <input
            type="file"
            accept="*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
          <IconButton size="small" onClick={() => fileInputRef.current.click()}>
            <CloudUpload sx={{ color: "#fff" }} />
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
          <IconButton color="error" onClick={() => setReportOpen(true)}>
            <ReportIcon />
          </IconButton>


          <Button variant="contained" sx={{ minWidth: "50px", py: 0.7 }} onClick={sendMessage}>
            <Send fontSize="small" />
          </Button>
        </Box>
      </Paper>
      {/* 🚨 REPORT DIALOG */}
<Dialog
  open={reportOpen}
  onClose={() => setReportOpen(false)}
  fullWidth
  PaperProps={{
    sx: {
      background: GLASS_BG,
      backdropFilter: GLASS_BLUR,
      border: GLASS_BORDER,
      color: "#EAF0FF",
    },
  }}
>
  <DialogTitle>Report User</DialogTitle>

  <DialogContent>
    <Typography variant="body2" sx={{ mb: 1 }}>
      Please select a reason for reporting:
    </Typography>

    <TextField
      select
      fullWidth
      label="Reason"
      value={reportReason}
      onChange={(e) => setReportReason(e.target.value)}
      SelectProps={{ native: true }}
      sx={{ mb: 2 }}
    >
      <option value=""></option>
      {REPORT_REASONS.map((reason) => (
        <option key={reason} value={reason}>
          {reason}
        </option>
      ))}
    </TextField>

    <TextField
      fullWidth
      multiline
      rows={3}
      label="Additional details (optional)"
      value={reportText}
      onChange={(e) => setReportText(e.target.value)}
    />
  </DialogContent>

  <DialogActions>
    <Button onClick={() => setReportOpen(false)}>Cancel</Button>
    <Button
      variant="contained"
      color="error"
      disabled={!reportReason}
      onClick={submitReport}
    >
      Submit Report
    </Button>
  </DialogActions>
</Dialog>

    </Box>
  );
}
