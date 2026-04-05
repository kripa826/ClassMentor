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
  deleteDoc, // NEW
  getDocs,   // NEW
  where,     // NEW
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { sendNotification } from "../utils/sendNotification";
import { compressImage } from "../utils/imageCompressor";
import { containsProfanity } from "../utils/profanityFilter";

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
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Rating, // NEW
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
  const [userRole, setUserRole] = useState("");     // NEW
  const [partnerRole, setPartnerRole] = useState(""); // NEW
  const bottomRef = useRef(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoCameraRef = useRef(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportText, setReportText] = useState("");
  const [isValidatingImage, setIsValidatingImage] = useState(false); // NEW

  // Image Viewer State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState(null);

  // Feedback System State
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");

  const GLASS_BG = "rgba(255, 255, 255, 0.08)";
  const GLASS_BORDER = "1px solid rgba(255, 255, 255, 0.15)";
  const GLASS_BLUR = "blur(20px) saturate(180%)";
  const PAGE_BG = "linear-gradient(-45deg, #063149, #1e4d6b, #0f2027, #203a43)";


  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const userDoc = await getDoc(doc(db, "users", u.uid));
        if (userDoc.exists()) {
          setUserEmail(userDoc.data().email);
          setUserRole(userDoc.data().role); // Fetch role
        }
      } else {
        setUser(null);
        setUserRole("");
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
        if (pDoc.exists()) {
          setPartnerEmail(pDoc.data().email || partnerId);
          setPartnerRole(pDoc.data().role); // Fetch partner role
        } else {
          setPartnerEmail(partnerId);
        }
      } catch (e) {
        setPartnerEmail(partnerId);
      }
    })();
  }, [pairId, user]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!user) return alert("⚠️ Please log in first.");

    if (containsProfanity(newMessage)) {
      alert("⚠️ Your message contains inappropriate language and cannot be sent.");
      return;
    }

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

  const submitFeedback = async () => {
    if (!rating || !user) return;

    const ids = pairId.split("_");
    const receiverId = ids.find((id) => id !== user.uid);

    try {
      await addDoc(collection(db, "feedback"), {
        fromUid: user.uid,
        fromEmail: userEmail,
        toUid: receiverId,
        pairId,
        rating,
        comment: feedbackText,
        timestamp: serverTimestamp(),
      });

      alert("✅ Feedback submitted! Thank you.");
      setFeedbackOpen(false);
      setRating(0);
      setFeedbackText("");

      // Notify the receiver
      await sendNotification(
        receiverId,
        auth.currentUser.uid,
        userEmail.split("@")[0],
        `rated you ${rating} stars`,
        "feedback"
      );

    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("❌ Failed to submit feedback.");
      return;
    }

    // 🛑 END THE CHAT (Delete Pair)
    try {
      // The pairId param is "uid1_uid2", but we need the document ID from "pairs" collection
      // We know one is user.uid, the other is receiverId

      // Query for the pair where birdId or buddyId matches
      // Since we don't know who is bird or buddy easily without checking roles,
      // we can check both combinations or just query where one param matches and filter

      const q = query(
        collection(db, "pairs"),
        where("birdId", "in", [user.uid, receiverId]),
        where("buddyId", "in", [user.uid, receiverId])
      );

      const snap = await getDocs(q);
      snap.forEach(async (d) => {
        await deleteDoc(doc(db, "pairs", d.id));
      });

      alert("👋 Chat ended. Redirecting to dashboard...");
      navigate(-1); // Go back to dashboard

    } catch (err) {
      console.error("Error ending chat:", err);
    }
  };

  const submitReport = async () => {
    if (!reportReason || !user) return;

    const ids = pairId.split("_");
    const reportedUserId = ids.find((id) => id !== user.uid);

    // Get the last 20 messages for context
    const recentMessages = messages.slice(-20).map(msg => ({
      senderEmail: msg.senderEmail || "Unknown",
      text: msg.type === "text" ? msg.text : `[${msg.type.toUpperCase()} SHARED]`,
      timestamp: msg.timestamp ? msg.timestamp.toDate().toISOString() : new Date().toISOString()
    }));

    await addDoc(collection(db, "reports"), {
      reporterId: user.uid,
      reporterEmail: userEmail,
      reporterRole: userRole || "unknown",
      reportedUserId,
      reportedUserEmail: partnerEmail || "Unknown",
      reportedUserRole: partnerRole || "unknown",
      reason: reportReason,
      description: reportText,
      pairId,
      chatHistory: recentMessages,
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

  const handleCopyImage = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      alert("✅ Image copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy image: ", err);
      alert("⚠️ Could not copy image. Your browser might not support this feature.");
    }
  };

  const handleDownloadImage = (imageUrl) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `ClassMentor_Chat_Image_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: PAGE_BG }}>
        <CircularProgress sx={{ color: "#5ED1C6" }} size={60} thickness={4} />
      </Box>
    );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: PAGE_BG,
        backgroundSize: "400% 400%",
        animation: "gradientBg 15s ease infinite",
        "@keyframes gradientBg": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: "rgba(6, 49, 73, 0.6)",
          backdropFilter: GLASS_BLUR,
          borderBottom: GLASS_BORDER,
          pt: { xs: 1, md: 0 },
          pb: { xs: 1, md: 0 },
        }}
      >
        <Toolbar sx={{ minHeight: "70px" }}>
          <IconButton edge="start" sx={{ color: "#EAF0FF", mr: 1 }} onClick={() => navigate(-1)}>
            <ArrowBack />
          </IconButton>

          <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
            <Avatar sx={{ width: 44, height: 44, mr: 1.5, background: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)", boxShadow: "0 4px 12px rgba(255, 107, 107, 0.4)" }}>
              {partnerEmail ? partnerEmail.charAt(0).toUpperCase() : "B"}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ color: "#FFFFFF", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.5px" }}>
                {partnerEmail ? partnerEmail.split("@")[0] : "Chat"}
              </Typography>
            </Box>
          </Box>

          {userRole !== "admin" && partnerRole !== "admin" &&
            userEmail !== "superbird21@gmail.com" && partnerEmail !== "superbird21@gmail.com" && (
              <Button
                variant="outlined"
                size="small"
                sx={{
                  color: "#5ED1C6",
                  borderColor: "rgba(94, 209, 198, 0.5)",
                  borderRadius: "20px",
                  px: 2,
                  "&:hover": { borderColor: "#5ED1C6", background: "rgba(94, 209, 198, 0.15)" }
                }}
                onClick={() => setFeedbackOpen(true)}
              >
                End & Rate
              </Button>
            )}
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: { xs: 2, md: 4 },
          display: "flex",
          flexDirection: "column",
          gap: 2,
          scrollBehavior: "smooth",
          "&::-webkit-scrollbar": { width: "6px" },
          "&::-webkit-scrollbar-thumb": { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "3px" },
        }}
      >
        {messages.map((msg) => (
          <Box
            key={msg.id}
            sx={{
              display: "flex",
              alignItems: "flex-end",
              gap: 1.5,
              alignSelf: msg.senderId === user?.uid ? "flex-end" : "flex-start",
              maxWidth: { xs: "90%", md: "75%" },
              animation: "fadeInUp 0.3s ease-out forwards",
              "@keyframes fadeInUp": {
                from: { opacity: 0, transform: "translateY(10px)" },
                to: { opacity: 1, transform: "translateY(0)" },
              }
            }}
          >
            {msg.senderId !== user?.uid && (
              <Avatar sx={{ background: "linear-gradient(135deg, #5ED1C6, #063149)", width: 36, height: 36, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                {msg.senderEmail ? msg.senderEmail.charAt(0).toUpperCase() : "U"}
              </Avatar>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", alignItems: msg.senderId === user?.uid ? "flex-end" : "flex-start", width: "100%" }}>
              <Paper
                elevation={0}
                sx={{
                  background:
                    msg.senderId === user?.uid
                      ? "linear-gradient(135deg, #00C6FF 0%, #0072FF 100%)" // Vibrant sender gradient
                      : "rgba(255, 255, 255, 0.1)", // Glassmorphic receiver
                  backdropFilter: msg.senderId === user?.uid ? "none" : GLASS_BLUR,
                  border: msg.senderId === user?.uid ? "none" : "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#FFFFFF",
                  borderRadius: msg.senderId === user?.uid ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                  px: 2,
                  py: 1.2,
                  boxShadow: msg.senderId === user?.uid ? "0 4px 15px rgba(0, 114, 255, 0.3)" : "0 4px 15px rgba(0,0,0,0.1)",
                  transition: "transform 0.2s",
                  "&:hover": { transform: "scale(1.01)" }
                }}
              >
                {msg.type === "image" ? (
                  <img
                    src={msg.image}
                    style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: 12, cursor: "zoom-in" }}
                    alt="chat attachment"
                    onClick={() => {
                      setViewerImage(msg.image);
                      setViewerOpen(true);
                    }}
                  />

                ) : msg.type === "video" ? (
                  <video src={msg.video} controls style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: 12 }} />

                ) : msg.type === "file" ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#FFF" }}>
                    <Typography sx={{ fontSize: 24 }}>📎</Typography>
                    <a
                      href={msg.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#FFF", fontWeight: "bold", textDecoration: "underline" }}
                    >
                      {msg.fileName}
                    </a>
                  </Box>

                ) : (
                  <Typography sx={{ fontSize: "1rem", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    {msg.text}
                  </Typography>

                )}
              </Paper>

              <Typography variant="caption" sx={{ mt: 0.5, color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", ml: 1, mr: 1 }}>
                {formatTime(msg.timestamp)}
              </Typography>
            </Box>
          </Box>
        ))}
        <div ref={bottomRef} />
      </Box>

      <Box sx={{ p: { xs: 1.5, md: 3 }, background: "transparent" }}>
        <Paper
          elevation={4}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: "6px 16px",
            background: "rgba(255, 255, 255, 0.08)",
            backdropFilter: GLASS_BLUR,
            border: GLASS_BORDER,
            borderRadius: "50px", // pill shape
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
            transition: "border-color 0.3s",
            "&:focus-within": {
              borderColor: "#00C6FF",
              boxShadow: "0 8px 32px rgba(0, 198, 255, 0.2)",
            }
          }}
        >
          <IconButton sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { color: "#FFF" } }} onClick={() => fileInputRef.current.click()}>
            <CloudUpload />
          </IconButton>
          <IconButton sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { color: "#FFF" } }} onClick={() => cameraInputRef.current.click()}>
            <PhotoCamera />
          </IconButton>
          <IconButton sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { color: "#FFF" } }} onClick={() => videoCameraRef.current.click()}>
            <Videocam />
          </IconButton>
          <IconButton color="error" sx={{ opacity: 0.8, "&:hover": { opacity: 1 } }} onClick={() => setReportOpen(true)}>
            <ReportIcon />
          </IconButton>

          <TextField
            fullWidth
            placeholder="Type a message..."
            value={newMessage}
            autoComplete="off"
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            variant="standard"
            InputProps={{
              disableUnderline: true,
              sx: { color: "#FFF", fontSize: "1rem" }
            }}
            sx={{
              flex: 1,
              mx: 1,
            }}
          />

          <input
            type="file"
            accept="*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={cameraInputRef}
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
          <input
            type="file"
            accept="video/*"
            capture="camcorder"
            ref={videoCameraRef}
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />

          <Button
            variant="contained"
            sx={{
              minWidth: "46px",
              width: "46px",
              height: "46px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #00C6FF 0%, #0072FF 100%)",
              boxShadow: "0 4px 15px rgba(0, 114, 255, 0.4)",
              p: 0,
              "&:hover": {
                background: "linear-gradient(135deg, #0072FF 0%, #00C6FF 100%)",
                transform: "scale(1.05)"
              },
              transition: "all 0.2s"
            }}
            onClick={sendMessage}
          >
            <Send sx={{ fontSize: "1.2rem", ml: "4px" }} />
          </Button>
        </Paper>
      </Box>
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
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                color: "#fff",
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(10px)",
                "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                "&:hover fieldset": { borderColor: "rgba(255,255,255,0.4)" },
                "&.Mui-focused fieldset": { borderColor: "#9B8CFF" },
              },
              "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.7)" },
              "& .MuiInputLabel-root.Mui-focused": { color: "#9B8CFF" },
            }}
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  sx: {
                    background: "rgba(30, 41, 59, 0.9)", // Dark glass
                    backdropFilter: "blur(16px) saturate(180%)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                    borderRadius: 2,
                    mt: 1,
                    "& .MuiMenuItem-root": {
                      "&:hover": {
                        background: "rgba(255,255,255,0.08)",
                      },
                      "&.Mui-selected": {
                        background: "rgba(155,140,255,0.15)",
                        "&:hover": { background: "rgba(155,140,255,0.25)" }
                      }
                    },
                  },
                },
              },
            }}
          >
            {REPORT_REASONS.map((reason) => (
              <MenuItem key={reason} value={reason}>
                {reason}
              </MenuItem>
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

      {/* ⭐ FEEDBACK DIALOG */}
      <Dialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        fullWidth
        PaperProps={{
          sx: {
            background: GLASS_BG,
            backdropFilter: GLASS_BLUR,
            border: GLASS_BORDER,
            color: "#EAF0FF",
            borderRadius: 3,
            p: 1
          },
        }}
      >
        <DialogTitle sx={{ textAlign: "center", fontWeight: 800 }}>
          Rate Your Session 🌟
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <Typography variant="body2" sx={{ opacity: 0.8, textAlign: "center" }}>
            How was your interaction? Your feedback helps us improve the mentorship quality.
          </Typography>

          <Rating
            name="simple-controlled"
            value={rating}
            onChange={(event, newValue) => {
              setRating(newValue);
            }}
            size="large"
            sx={{
              "& .MuiRating-iconFilled": { color: "#F4D58D" },
              "& .MuiRating-iconEmpty": { color: "rgba(255,255,255,0.3)" },
            }}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Any additional comments? (Optional)"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                color: "#fff",
                background: "rgba(255,255,255,0.05)",
                borderRadius: 2,
                "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                "&:hover fieldset": { borderColor: "rgba(255,255,255,0.4)" },
                "&.Mui-focused fieldset": { borderColor: "#5ED1C6" },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
          <Button onClick={() => setFeedbackOpen(false)} sx={{ color: "rgba(255,255,255,0.6)" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitFeedback}
            disabled={!rating}
            sx={{
              background: "linear-gradient(135deg, #5ED1C6, #063149)",
              fontWeight: "bold",
              px: 4
            }}
          >
            Submit Feedback
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🖼️ FULL SCREEN IMAGE VIEWER */}
      <Dialog
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            background: "rgba(0, 0, 0, 0.9)",
            backdropFilter: "blur(10px)",
            boxShadow: "none",
            m: 0,
            width: "100%",
            height: "100%",
            maxHeight: "100%",
            borderRadius: 0,
            overflow: "hidden"
          }
        }}
      >
        <Box sx={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 1, zIndex: 10 }}>
          <IconButton
            onClick={() => handleDownloadImage(viewerImage)}
            sx={{ color: "white", bgcolor: "rgba(255,255,255,0.1)", "&:hover": { bgcolor: "rgba(255,255,255,0.2)" } }}
          >
            <DownloadIcon />
          </IconButton>
          <IconButton
            onClick={() => handleCopyImage(viewerImage)}
            sx={{ color: "white", bgcolor: "rgba(255,255,255,0.1)", "&:hover": { bgcolor: "rgba(255,255,255,0.2)" } }}
          >
            <ContentCopyIcon />
          </IconButton>
          <IconButton
            onClick={() => setViewerOpen(false)}
            sx={{ color: "white", bgcolor: "rgba(255,255,255,0.1)", "&:hover": { bgcolor: "rgba(255,255,255,0.2)" } }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 0, display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
          {viewerImage && (
            <img
              src={viewerImage}
              alt="Full screen viewer"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                animation: "zoomIn 0.3s ease-out",
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
