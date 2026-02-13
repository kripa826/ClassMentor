import React, { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { BUDDY_REQUEST_REASONS } from "../constants/pairRequestReasons";
import { addDoc, serverTimestamp } from "firebase/firestore";
import { orderBy } from "firebase/firestore";


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
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import LogoutIcon from "@mui/icons-material/Logout";
import PeopleIcon from "@mui/icons-material/People";
import { useNavigate } from "react-router-dom";

/* ---------- Shared Palette ---------- */
const PALETTE = {
  pageBg: "linear-gradient(180deg, #063149ff 0%, #7aa5dfff 100%)",
  text: "#EAF0FF",
  accent: "#9B8CFF",
};

/* ---------- Glass Card ---------- */
function GlassCard({ children, sx = {} }) {
  return (
    <Paper
      elevation={0}
      sx={{
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(14px) saturate(160%)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        p: 2.5,
        boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
        color: PALETTE.text,
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}

export default function BuddyDashboard() {
  const [user, setUser] = useState(null);
  const [pairs, setPairs] = useState([]);
  const [birdMap, setBirdMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [progressMap, setProgressMap] = useState({});
  const [requestOpen, setRequestOpen] = useState(false);
const [requestReason, setRequestReason] = useState("");
const [selectedBirdId, setSelectedBirdId] = useState(null);
const [notifications, setNotifications] = useState([]);

const [notifOpen, setNotifOpen] = useState(false);

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

    // buddy progress (SELF progress)
    const buddySnap = await getDoc(doc(db, "users", currentUser.uid));
    if (buddySnap.exists() && buddySnap.data().progress) {
      setProgressMap(buddySnap.data().progress);
    }
  })
);


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
    <Avatar sx={{ bgcolor: PALETTE.accent }}>🐥</Avatar>

    <Box>
      <Typography sx={{ fontWeight: 800, color: PALETTE.text }}>
        {user?.email?.split("@")[0] || "Buddy"}
      </Typography>

      <Typography variant="caption" color="rgba(255,255,255,0.6)">
        {user?.email}
      </Typography>
    </Box>
  </Stack>

  {/* Logout button */}
  <Stack direction="row" spacing={1} alignItems="center">

  {/* 🔔 Notification Button */}
  <Button
  onClick={async () => {
    setNotifOpen(true);

    // mark all unread as read
    const unread = notifications.filter(n => !n.read);

    for (let n of unread) {
      await updateDoc(doc(db, "notifications", n.id), {
        read: true
      });
    }
  }}
>
  🔔 {notifications.filter(n => !n.read).length}
</Button>


  {/* Logout */}
  <Tooltip title="Logout">
    <IconButton onClick={handleLogout}>
      <LogoutIcon sx={{ color: PALETTE.text }} />
    </IconButton>
  </Tooltip>

</Stack>

</Toolbar>

      </AppBar>

      {/* CONTENT */}
      <Box mx={{ xs: 1, md: 3 }} mt={3}>
        {/* Stats */}
        <GlassCard sx={{ mb: 3 }}>
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
  <Button
    variant="contained"
    startIcon={<ChatIcon />}
    onClick={() => goToChat(pair.birdId)}
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      background: "rgba(94,209,198,0.15)", // SAME AS YOUR BUDDY CARDS
    }}
  >
    Chat
  </Button>

  <Button
    variant="outlined"
    color="warning"
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
      <Button
        onClick={() => {
          const chatId = [auth.currentUser.uid, "SUPERBIRD_UID"]
            .sort()
            .join("_");

          navigate(`/chat/${chatId}`);
        }}
        variant="contained"
        startIcon={<ChatIcon />}
      >
        Chat
      </Button>
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

  {Object.entries(progressMap).map(([subject, units]) => (
    <Box key={subject} sx={{ mb: 3 }}>
      <Typography
        sx={{
          fontWeight: 900,
          fontSize: 13,
          color: "#F4D58D",
          textTransform: "uppercase",
          letterSpacing: 1,
          mb: 1,
        }}
      >
        {subject}
      </Typography>

      {Object.entries(units).map(([unit, value]) => (
        <Box
          key={unit}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            background: "rgba(255,255,255,0.05)",
            p: 1,
            borderRadius: 1,
            mb: 1,
          }}
        >
          <Typography fontSize={13}>{unit.toUpperCase()}</Typography>
          <Typography fontSize={13} fontWeight={800}>
            {value}%
          </Typography>
        </Box>
      ))}
    </Box>
  ))}
</GlassCard>

      </Box>
      <Dialog open={requestOpen} onClose={() => setRequestOpen(false)}>
  <DialogTitle>Request New Pair</DialogTitle>
  <DialogContent>
    {BUDDY_REQUEST_REASONS.map((r) => (
      <Button
        key={r}
        fullWidth
        sx={{ mt: 1 }}
        variant={requestReason === r ? "contained" : "outlined"}
        onClick={() => setRequestReason(r)}
      >
        {r}
      </Button>
    ))}
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setRequestOpen(false)}>Cancel</Button>
    <Button
      variant="contained"
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
