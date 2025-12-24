import React, { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  doc,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import LogoutIcon from "@mui/icons-material/Logout";
import PeopleIcon from "@mui/icons-material/People";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

/* ---------- Palette ---------- */
const PALETTE = {
  pageBg: "linear-gradient(180deg, #063149ff 0%, #7aa5dfff 100%)",
  text: "#EAF0FF",
  accent: "#5ED1C6",
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

export default function BirdDashboard() {
  const [user, setUser] = useState(null);
  const [pairs, setPairs] = useState([]);
  const [buddyMap, setBuddyMap] = useState({});
  const [profileName, setProfileName] = useState("");
  const [loading, setLoading] = useState(true);

  // Progress dialog state
  const [progressOpen, setProgressOpen] = useState(false);
  const [selectedBuddyId, setSelectedBuddyId] = useState(null);
  const [progressData, setProgressData] = useState({});

  const navigate = useNavigate();

  /* ---------- AUTH + DATA ---------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      setUser(currentUser);

      // Fetch profile name
      const userSnap = await getDoc(doc(db, "users", currentUser.uid));
      if (userSnap.exists()) {
        setProfileName(userSnap.data().name || userSnap.data().email);
      }

      // Fetch pairs
      const q = query(
        collection(db, "pairs"),
        where("birdId", "==", currentUser.uid)
      );
      const snap = await getDocs(q);
      const pairData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPairs(pairData);

      // Fetch buddy details
      const buddyIds = [...new Set(pairData.map((p) => p.buddyId))];
      const buddyDetails = {};

      await Promise.all(
        buddyIds.map(async (buddyId) => {
          const buddySnap = await getDoc(doc(db, "users", buddyId));
          if (buddySnap.exists()) {
            buddyDetails[buddyId] = buddySnap.data();
          }
        })
      );

      setBuddyMap(buddyDetails);
      setLoading(false);
    });

    return () => unsub();
  }, [navigate]);

  /* ---------- ACTIONS ---------- */
  const goToChat = (buddyId) => {
    const chatId = [auth.currentUser.uid, buddyId].sort().join("_");
    navigate(`/chat/${chatId}`);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  /* ---------- PROGRESS ---------- */
  const openProgress = async (buddyId) => {
    setSelectedBuddyId(buddyId);
    const snap = await getDoc(doc(db, "users", buddyId));

    setProgressData(
      snap.exists() && snap.data().progress
        ? snap.data().progress
        : {
            subject1: { unit1: 0, unit2: 0, unit3: 0 },
            subject2: { unit1: 0, unit2: 0, unit3: 0 },
            subject3: { unit1: 0, unit2: 0, unit3: 0 },
          }
    );

    setProgressOpen(true);
  };

  const saveProgress = async () => {
    if (!selectedBuddyId) return;

    await updateDoc(doc(db, "users", selectedBuddyId), {
      progress: progressData,
    });

    setProgressOpen(false);
  };

  /* ---------- LOADING ---------- */
  if (loading) {
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
  }

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
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/profile")}
          >
            <Avatar sx={{ bgcolor: PALETTE.accent }}>🐦</Avatar>
            <Box>
              <Typography sx={{ fontWeight: 800, color: PALETTE.text }}>
                {profileName || "Bird"}
              </Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.6)">
                {user?.email}
              </Typography>
            </Box>
          </Stack>

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
              <Typography fontWeight={800}>Total Buddies</Typography>
              <Typography variant="h6">{pairs.length}</Typography>
            </Box>
          </Stack>
        </GlassCard>

        {/* Buddies */}
        <GlassCard>
          <Typography variant="h6" fontWeight={800} mb={2}>
            Your Buddies 🐥
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {pairs.length === 0 ? (
            <Typography>No buddies assigned yet.</Typography>
          ) : (
            <Stack spacing={2}>
              {pairs.map((pair) => (
                <GlassCard
                  key={pair.id}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(94,209,198,0.15)",
                  }}
                >
                  <Typography fontWeight={800}>
                    🧑‍🎓 {buddyMap[pair.buddyId]?.email || "Unknown Buddy"}
                  </Typography>

                  <Stack direction="row" spacing={1}>
                    <Button
                      onClick={() => goToChat(pair.buddyId)}
                      variant="contained"
                      startIcon={<ChatIcon />}
                    >
                      Chat
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => openProgress(pair.buddyId)}
                      sx={{ color: "white", borderColor: "white" }}
                    >
                      Progress
                    </Button>
                  </Stack>
                </GlassCard>
              ))}
            </Stack>
          )}
        </GlassCard>
      </Box>

      {/* PROGRESS DIALOG */}
      <Dialog
  open={progressOpen}
  onClose={() => setProgressOpen(false)}
  fullWidth
  maxWidth="sm"
  PaperProps={{
    sx: {
      borderRadius: 4,
      background: "rgba(255,255,255,0.06)",
      backdropFilter: "blur(16px) saturate(160%)",
      border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "0 30px 70px rgba(0,0,0,0.55)",
      color: PALETTE.text,
    },
  }}
>
  {/* ===== Header ===== */}
  <DialogTitle
    sx={{
      fontWeight: 900,
      fontSize: 18,
      letterSpacing: 0.5,
      color: "#F4D58D", // same yellow accent as admin
      display: "flex",
      alignItems: "center",
      gap: 1,
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    }}
  >
    📚 Study Progress
    <Typography
      component="span"
      sx={{
        fontWeight: 600,
        opacity: 0.75,
        fontSize: 13,
      }}
    >
      — Update Buddy Progress
    </Typography>
  </DialogTitle>

  {/* ===== Content ===== */}
  <DialogContent
    dividers
    sx={{
      px: 3,
      py: 2,
      borderColor: "rgba(255,255,255,0.06)",
    }}
  >
    {Object.entries(progressData).map(([subject, units]) => (
      <Box
        key={subject}
        sx={{
          mb: 3,
          p: 2,
          borderRadius: 2,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(14px) saturate(160%)",
        }}
      >
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
          <Box key={unit} sx={{ mb: 1.5 }}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {unit.toUpperCase()} — {value}%
            </Typography>

            <Slider
              value={value}
              onChange={(e, val) =>
                setProgressData((prev) => ({
                  ...prev,
                  [subject]: {
                    ...prev[subject],
                    [unit]: val,
                  },
                }))
              }
              step={10}
              marks
              min={0}
              max={100}
              sx={{
                color: "#9B8CFF", // purple accent like admin
              }}
            />
          </Box>
        ))}
      </Box>
    ))}
  </DialogContent>

  {/* ===== Footer ===== */}
  <DialogActions
    sx={{
      px: 3,
      pb: 2,
      pt: 1,
      justifyContent: "flex-end",
    }}
  >
    <Button
      onClick={() => setProgressOpen(false)}
      sx={{
        color: "#F4D58D",
        fontWeight: 700,
        textTransform: "none",
      }}
    >
      Cancel
    </Button>

    <Button
      onClick={saveProgress}
      sx={{
        ml: 1,
        bgcolor: "rgba(155,140,255,0.15)",
        color: "#F4D58D",
        fontWeight: 800,
        textTransform: "none",
        borderRadius: 2,
        border: "1px solid rgba(155,140,255,0.35)",
        "&:hover": {
          bgcolor: "rgba(155,140,255,0.25)",
        },
      }}
    >
      Save Progress
    </Button>
  </DialogActions>
</Dialog>

    </Box>
  );
}
