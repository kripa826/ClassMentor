import React, { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
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
  const navigate = useNavigate();

  /* ---------- AUTH + DATA ---------- */
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
        birdIds.map(async (birdId) => {
          const s = await getDoc(doc(db, "users", birdId));
          if (s.exists()) details[birdId] = s.data();
        })
      );

      setBirdMap(details);
      setLoading(false);
    });

    return () => unsub();
  }, [navigate]);

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
  <Tooltip title="Logout">
    <IconButton onClick={handleLogout}>
      <LogoutIcon sx={{ color: PALETTE.text }} />
    </IconButton>
  </Tooltip>
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

                  <Button
                    variant="contained"
                    startIcon={<ChatIcon />}
                    onClick={() => goToChat(pair.birdId)}
                    sx={{
                      bgcolor: "#9B8CFF",
                      color: "white",
                      fontWeight: 800,
                      borderRadius: 2,
                      textTransform: "none",
                      "&:hover": { bgcolor: "#8577ff" },
                    }}
                  >
                    Open Chat
                  </Button>
                </GlassCard>
              ))}
            </Stack>
          )}
        </GlassCard>
      </Box>
    </Box>
  );
}
