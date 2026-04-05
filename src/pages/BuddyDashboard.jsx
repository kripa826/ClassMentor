import React, { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { BUDDY_REQUEST_REASONS } from "../constants/pairRequestReasons";
import { addDoc, serverTimestamp } from "firebase/firestore";
import { orderBy } from "firebase/firestore";
import NotificationBell from "../components/NotificationBell";

import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  onSnapshot

} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  Box,
  Avatar,
  Typography,
  Button,
  AppBar,
  Toolbar,
  CircularProgress,
  Stack,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import LogoutIcon from "@mui/icons-material/Logout";
import PeopleIcon from "@mui/icons-material/People";
import StarIcon from "@mui/icons-material/Star"; // NEW
import { useNavigate } from "react-router-dom";

import { PALETTE } from "../constants/theme";
import GlassCard from "../components/GlassCard";

export default function BuddyDashboard() {
  const [user, setUser] = useState(null);
  const [pairs, setPairs] = useState([]);
  const [birdMap, setBirdMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [progressMap, setProgressMap] = useState({});
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [selectedBirdId, setSelectedBirdId] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const [notifOpen, setNotifOpen] = useState(false);

  // Feedback Data
  const [feedbacks, setFeedbacks] = useState([]);
  const [avgRating, setAvgRating] = useState(0);

  const navigate = useNavigate();

  /* ---------- AUTH + DATA ---------- */
  const submitPairRequest = async () => {
    if (!selectedBirdId || !requestReason) return;

    await addDoc(collection(db, "pairRequests"), {
      requesterId: user.uid,
      requesterRole: "buddy",
      currentPairId: pairs[0]?.id || null,
      requestedForId: selectedBirdId,
      reason: requestReason,
      status: "pending",
      createdAt: new Date(),
    });

    setRequestOpen(false);
    setRequestReason("");
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return navigate("/login");

      setUser(currentUser);

      // fetch pairs where buddy = user
      const q = query(
        collection(db, "pairs"),
        where("buddyId", "==", currentUser.uid)
      );

      const snap = await getDocs(q);
      const pairData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPairs(pairData);

      // fetch bird details
      const birdIds = [...new Set(pairData.map((p) => p.birdId))];
      const details = {};

      await Promise.all(
        pairData.map(async (pair) => {
          // bird details
          const birdSnap = await getDoc(doc(db, "users", pair.birdId));
          if (birdSnap.exists()) details[pair.birdId] = birdSnap.data();
        })
      );

      // fetch self profile details regardless of pairs
      const buddySnap = await getDoc(doc(db, "users", currentUser.uid));
      if (buddySnap.exists()) {
        const data = buddySnap.data();
        if (data.progress) setProgressMap(data.progress);
        setProfileName(data.name || currentUser.email.split("@")[0]);
      }

      setBirdMap(details);
      setLoading(false);
    });

    return () => unsub();
  }, [navigate]);
  // 🔔 Notifications listener
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "notifications"),
      where("toUserId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc")
    );



    const unsub = onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      );

    });

    return () => unsub();
  }, []);

  // 🌟 Fetch Feedback
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, "feedback"),
      where("toUid", "==", auth.currentUser.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const fbs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFeedbacks(fbs);

      if (fbs.length > 0) {
        const total = fbs.reduce((acc, curr) => acc + (curr.rating || 0), 0);
        setAvgRating((total / fbs.length).toFixed(1));
      }
    });
    return () => unsub();
  }, []);


  /* ---------- ACTIONS ---------- */
  const goToChat = (birdId) => {
    const chatId = [auth.currentUser.uid, birdId].sort().join("_");
    navigate(`/chat/${chatId}`);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (loading)
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: PALETTE.pageBg,
        }}
      >
        <CircularProgress />
      </Box>
    );

  /* ---------- UI ---------- */
  return (
    <Box sx={{ minHeight: "100vh", background: PALETTE.pageBg, pb: 6 }}>
      {/* HEADER */}
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          backdropFilter: "blur(6px)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", mx: { xs: 1, md: 3 } }}>
          {/* Profile section — clickable like Bird Dashboard */}
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/profile")}
          >
            <Avatar sx={{ bgcolor: PALETTE.pastelPurple }}>🐥</Avatar>

            <Box>
              <Typography sx={{ fontWeight: 800, color: PALETTE.textLight }}>
                {profileName || "Buddy"}
              </Typography>

              <Typography variant="caption" color="rgba(255,255,255,0.6)">
                {user?.email}
              </Typography>
            </Box>
          </Stack>

          {/* Logout button */}
          <Stack direction="row" spacing={1} alignItems="center">

            {user && (
              <NotificationBell userId={user.uid} />
            )}

            {/* Logout */}
            <Tooltip title="Logout">
              <IconButton
                onClick={handleLogout}
                sx={{
                  color: "#FF6B6B",
                  bgcolor: "rgba(255,107,107,0.1)",
                  "&:hover": { bgcolor: "rgba(255,107,107,0.2)" }
                }}
              >
                <LogoutIcon />
              </IconButton>
            </Tooltip>

          </Stack>

        </Toolbar>

      </AppBar>

      {/* CONTENT */}
      <Box mx={{ xs: 1, md: 3 }} mt={3}>
        {/* Stats */}
        <Stack direction="row" spacing={3} mb={3}>
          <GlassCard sx={{ flex: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: PALETTE.accent }}>
                <PeopleIcon />
              </Avatar>
              <Box>
                <Typography fontWeight={800}>Assigned Bird</Typography>
                <Typography variant="h6">{pairs.length || 0}</Typography>
              </Box>
            </Stack>
          </GlassCard>

          <GlassCard sx={{ flex: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: "#F4D58D" }}>
                <StarIcon sx={{ color: "#fff" }} />
              </Avatar>
              <Box>
                <Typography fontWeight={800}>Avg Rating</Typography>
                <Typography variant="h6">{avgRating} / 5.0</Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {feedbacks.length} reviews
                </Typography>
              </Box>
            </Stack>
          </GlassCard>
        </Stack>

        {/* Bird List */}
        <GlassCard>
          <Typography variant="h6" fontWeight={800} mb={2}>
            Your Bird 🐦
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {pairs.length === 0 ? (
            <Typography>No bird assigned yet.</Typography>
          ) : (
            <Stack spacing={2}>
              {pairs.map((pair) => (
                <GlassCard
                  key={pair.id}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(155,140,255,0.12)",
                  }}
                >
                  <Typography fontWeight={800}>
                    🦅 {birdMap[pair.birdId]?.email || "Unknown Bird"}
                  </Typography>

                  <Stack
                    direction="row"
                    spacing={2}
                    alignItems="center"
                  >
                    <Tooltip title="Chat with bird">
                      <IconButton onClick={() => goToChat(pair.birdId)} sx={{ bgcolor: "white", color: "black", "&:hover": { bgcolor: "#f0f0f0" } }}>
                        <ChatIcon />
                      </IconButton>
                    </Tooltip>

                    <Button
                      variant="contained"
                      onClick={() => {
                        setRequestOpen(true);
                        setSelectedBirdId(pair.birdId);
                      }}
                    >
                      🔁 Request New Pair
                    </Button>
                  </Stack>


                </GlassCard>

              ))}
            </Stack>
          )}
        </GlassCard>
        {/* ===== TALK WITH SUPERBIRD ===== */}
        <GlassCard sx={{ mt: 3 }}>
          <Typography variant="h6" fontWeight={800} mb={2}>
            Talk with SuperBird 🦅
          </Typography>

          <Divider sx={{ mb: 2 }} />

          <GlassCard
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(94,209,198,0.15)", // SAME AS YOUR BUDDY CARDS
            }}
          >
            <Typography fontWeight={800}>
              🦅 superbird21@gmail.com
            </Typography>

            <Stack direction="row" spacing={1}>
              <Tooltip title="Chat with SuperBird">
                <IconButton
                  onClick={() => {
                    const chatId = [auth.currentUser.uid, "H8E2Phu6BmOOscY9cJdl29YhkT42"]
                      .sort()
                      .join("_");

                    navigate(`/chat/${chatId}`);
                  }}
                  sx={{ bgcolor: "white", color: "black", "&:hover": { bgcolor: "#f0f0f0" } }}
                >
                  <ChatIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </GlassCard>
        </GlassCard>

        {/* ===== FULL WIDTH PROGRESS SECTION ===== */}
        <GlassCard
          sx={{
            mt: 3,
            background: "rgba(255,255,255,0.08)",
          }}
        >
          <Typography variant="h6" fontWeight={800} mb={2}>
            📚 Your Study Progress
          </Typography>

          {Object.keys(progressMap).length === 0 ? (
            <Typography sx={{ color: "rgba(255,255,255,0.6)" }}>No study progress data available yet.</Typography>
          ) : (
            <Stack direction="row" spacing={3} sx={{ overflowX: "auto", pb: 2 }}>
              {Object.entries(progressMap).map(([subject, units]) => {
                const unitValues = Object.values(units);
                const subjectAvg = unitValues.length > 0
                  ? Math.round(unitValues.reduce((a, b) => a + b, 0) / unitValues.length)
                  : 0;

                let ringColor = "#00C6FF";
                if (subjectAvg === 100) ringColor = "#4ade80";
                else if (subjectAvg < 30) ringColor = "#FF6B6B";

                return (
                  <GlassCard
                    key={subject}
                    sx={{
                      flex: 1, // Let cards stretch to fill space evenly
                      minWidth: "250px", // Ensure they don't get too slim on small screens
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: 16,
                        color: "#FFFFFF",
                        textTransform: "uppercase",
                        letterSpacing: 1.5,
                        mb: 2,
                        textAlign: "center"
                      }}
                    >
                      {subject}
                    </Typography>

                    <Box sx={{ position: "relative", display: "inline-flex", mb: 3 }}>
                      <CircularProgress
                        variant="determinate"
                        value={100}
                        size={110}
                        thickness={5}
                        sx={{ color: "rgba(255,255,255,0.05)", position: "absolute" }}
                      />
                      <CircularProgress
                        variant="determinate"
                        value={subjectAvg}
                        size={110}
                        thickness={5}
                        sx={{
                          color: ringColor,
                          "& .MuiCircularProgress-circle": {
                            strokeLinecap: "round",
                          }
                        }}
                      />
                      <Box
                        sx={{
                          top: 0, left: 0, bottom: 0, right: 0,
                          position: "absolute",
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}
                      >
                        <Typography variant="h5" sx={{ fontWeight: 900, color: "#FFF", lineHeight: 1 }}>
                          {subjectAvg}%
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ width: "100%", mt: "auto", background: "rgba(0,0,0,0.15)", p: 1.5, borderRadius: 2 }}>
                      <Stack spacing={1.2} sx={{ width: "100%" }}>
                        {Object.entries(units).map(([unit, value]) => (
                          <Stack key={unit} direction="row" alignItems="center" spacing={1}>
                            <Typography fontSize={11} fontWeight={700} sx={{ color: "rgba(255,255,255,0.9)", minWidth: "40px" }}>
                              {unit.toUpperCase()}
                            </Typography>

                            <LinearProgress
                              variant="determinate"
                              value={value}
                              sx={{
                                flex: 1, height: 6, borderRadius: 3,
                                bgcolor: "rgba(255,255,255,0.1)",
                                "& .MuiLinearProgress-bar": {
                                  borderRadius: 3,
                                  background: value === 100
                                    ? "linear-gradient(90deg, #4ade80, #22c55e)"
                                    : "linear-gradient(90deg, #00C6FF, #0072FF)",
                                }
                              }}
                            />

                            <Typography fontSize={11} fontWeight={800} sx={{ color: value === 100 ? "#4ade80" : "#A0B5D6", minWidth: "28px", textAlign: "right" }}>
                              {value}%
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  </GlassCard>
                );
              })}
            </Stack>
          )}
        </GlassCard>

      </Box>
      <Dialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(16px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 30px 70px rgba(0,0,0,0.55)",
            color: "#EAF0FF",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 900,
            fontSize: 18,
            color: "#9B8CFF",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          🔁 Request New Pair
        </DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          {BUDDY_REQUEST_REASONS.map((r) => (
            <Button
              key={r}
              fullWidth
              sx={{
                mt: 1,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 700,
                color: "#fff",
                borderColor: "rgba(255,255,255,0.2)",
                background:
                  requestReason === r
                    ? "linear-gradient(135deg, #9B8CFF, #7B61FF)"
                    : "rgba(255,255,255,0.05)",
                "&:hover": {
                  background:
                    requestReason === r
                      ? "linear-gradient(135deg, #9B8CFF, #7B61FF)"
                      : "rgba(255,255,255,0.1)",
                },
              }}
              variant="outlined"
              onClick={() => setRequestReason(r)}
            >
              {r}
            </Button>
          ))}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setRequestOpen(false)}
            sx={{ color: "#aaa", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            sx={{
              borderRadius: 2,
              fontWeight: 800,
              background: "linear-gradient(135deg, #9B8CFF, #7B61FF)",
            }}
            onClick={async () => {
              await addDoc(collection(db, "pairRequests"), {
                requesterId: user.uid,
                requesterEmail: user.email,
                requesterRole: "buddy",
                requestedForId: selectedBirdId,
                reason: requestReason,
                status: "pending",
                createdAt: serverTimestamp(),
              });
              alert("✅ Request sent to SuperBird");
              setRequestOpen(false);
              setRequestReason("");
            }}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={notifOpen} onClose={() => setNotifOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Notifications</DialogTitle>

        <DialogContent>
          {notifications.length === 0 ? (
            <Typography>No notifications</Typography>
          ) : (
            notifications.map((n) => (
              <Box key={n.id} sx={{ mb: 2 }}>
                <Typography fontWeight={700}>
                  {n.fromName}
                </Typography>

                <Typography fontWeight={700}>
                  {n.fromName}{" "}
                  {n.type === "chat" && "sent you a message"}
                  {n.type === "pair" && "updated your pairing"}
                  {n.type === "report" && "submitted a report"}
                </Typography>


                <Divider sx={{ mt: 1 }} />
              </Box>
            ))
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setNotifOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
