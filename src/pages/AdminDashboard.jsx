import React, { useEffect, useMemo, useState, useLayoutEffect, useRef } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import {
  Box,
  Avatar,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  AppBar,
  Toolbar,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
  TextField,
  Tooltip,
  InputAdornment,
} from "@mui/material";
import {
  Chat as ChatIcon,
  Add as AddIcon,
  Logout,
  Delete as DeleteIcon,
  Edit,
  ExpandMore,
  Search as SearchIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  Link as LinkIcon,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

/* ---------- Vibrant palette (same hues, higher saturation & contrast) ---------- */
const PALETTE = {
  mintTeal: "#5ED1C6",        // softer teal (Birds)
  peach: "#E6A08A",          // warm peach (Buddies)
  softYellow: "#F4D58D",     // pastel yellow (chips / highlights)
  pastelPurple: "#9B8CFF",   // primary accent (Pairs / CTAs)

  pageBg: "linear-gradient(180deg, #063149ff 0%, #7aa5dfff 100%)",

  cardBorder: "rgba(255,255,255,0.08)",
  textDark: "#EAF0FF",
};

/* ---------- glass-poster gradients inspired by the image ---------- */
const GLASS_GRADIENTS = {
  teal: {
    background: `
      linear-gradient(135deg, rgba(94,209,198,0.85) 0%, rgba(72,180,255,0.85) 70%),
      radial-gradient(900px 260px at 10% 10%, rgba(255,255,255,0.10), transparent 14%)
    `,
    avatar: "linear-gradient(135deg, #5ED1C6, #AEECEF)",
    chipBg: "#5ED1C6",
    text: "#062925",
    border: "1px solid rgba(255,255,255,0.12)",
  },

  magenta: {
    background: `
      linear-gradient(135deg, rgba(230,160,138,0.9) 0%, rgba(255,135,175,0.85) 70%),
      radial-gradient(900px 260px at 12% 10%, rgba(255,255,255,0.10), transparent 14%)
    `,
    avatar: "linear-gradient(135deg, #E6A08A, #FFD1C4)",
    chipBg: "#E6A08A",
    text: "#3A1610",
    border: "1px solid rgba(255,255,255,0.12)",
  },

  yellow: {
    background: `
      linear-gradient(135deg, rgba(155,140,255,0.9) 0%, rgba(120,110,255,0.85) 70%),
      radial-gradient(900px 260px at 12% 10%, rgba(255,255,255,0.10), transparent 14%)
    `,
    avatar: "linear-gradient(135deg, #9B8CFF, #C7BFFF)",
    chipBg: "#9B8CFF",
    text: "#1A1445",
    border: "1px solid rgba(255,255,255,0.12)",
  },
};

const glassBox = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(14px) saturate(160%)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
  px: 2,
  py: 1.5,
};

/* rounded pill style */
const pill = {
  borderRadius: 999,
  textTransform: "none",
  px: 2,
  py: 0.6,
};

/* Quick action tabs (stable constant) */
const QUICK_TABS = [
  { id: "birds", label: "Birds" },
  { id: "buddies", label: "Buddies" },
  { id: "pairs", label: "Pairs" },
  { id: "reports", label: "Reports" }

];

/* ---------- GlassCard component (frosted + vibrant tint) ---------- */
function GlassCard({ children, sx = {}, ...props }) {
  return (
    <Paper
      elevation={0}
      sx={{
        backgroundColor: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(10px)",
        border: `1px solid ${PALETTE.cardBorder}`,
        borderRadius: 12,
        p: 2.5,
        boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
        color: PALETTE.textDark,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Paper>
  );
}

/* ---------- Framer Motion variants ---------- */
const statCardVariant = {
  hidden: { opacity: 0, y: -8, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: "easeOut" } },
};

const listContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.08,
    },
  },
};

const listItemVariant = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.36, ease: "easeOut" } },
};

const buttonTap = { scale: 0.98 };
const avatarHover = { scale: 1.06, rotate: -2 };

export default function AdminDashboard() {
  const [birds, setBirds] = useState([]);
  const [buddies, setBuddies] = useState([]);
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("birds");

  // helper for quick actions tabs to compute slider position
  const activeIndex = QUICK_TABS.findIndex((t) => t.id === activeTab);

  // refs and state for measuring the sliding indicator
  const tabsRef = useRef(null);
  const tabCount = QUICK_TABS.length;
  const [indicatorStyle, setIndicatorStyle] = useState({ left: null, width: null });

  // measure indicator position/width when active tab changes or window resizes
  useLayoutEffect(() => {
    function measure() {
      const container = tabsRef.current;
      if (!container) return;
      const activeBtn = container.querySelector(`#qa-pill-${QUICK_TABS[activeIndex].id}`);
      if (activeBtn) {
        const btnRect = activeBtn.getBoundingClientRect();
        const contRect = container.getBoundingClientRect();
        // compute left within container and add small inset
        const left = Math.round(btnRect.left - contRect.left) + 6;
        const width = Math.max(40, Math.round(btnRect.width - 12));
        setIndicatorStyle((prev) => {
          if (prev.left === left && prev.width === width) return prev;
          return { left, width };
        });
      } else {
        // fallback to equal thirds
        const width = Math.max(40, Math.round((container.clientWidth - 12) / tabCount));
        const left = Math.round(6 + activeIndex * (container.clientWidth / tabCount));
        setIndicatorStyle((prev) => {
          if (prev.left === left && prev.width === width) return prev;
          return { left, width };
        });
      }
    }

    measure();
    window.addEventListener("resize", measure);
    // small delayed re-measure for fonts/DOM
    const t = setTimeout(measure, 120);
    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(t);
    };
  }, [activeIndex, tabCount]);


  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPair, setSelectedPair] = useState(null);
  const [editBird, setEditBird] = useState("");
  const [editBuddy, setEditBuddy] = useState("");

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedBirdId, setSelectedBirdId] = useState(null);
  const [actionsDialogOpen, setActionsDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
const [reports, setReports] = useState([]);

  // UI extras
  const [q, setQ] = useState("");

  const navigate = useNavigate();

  const selectedBird = useMemo(
    () => birds.find((b) => b.id === selectedBirdId) || null,
    [birds, selectedBirdId]
  );

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersSnapshot, pairsSnapshot] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "pairs")),
      ]);

      const allUsers = usersSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const reportsSnap = await getDocs(collection(db, "reports"));
setReports(
  reportsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
);


      const birdUsers = allUsers.filter((u) => u.role === "bird");
      const buddyUsers = allUsers.filter((u) => u.role === "buddy");
      const pairsData = pairsSnapshot.docs.map((p) => ({
        id: p.id,
        ...p.data(),
      }));

      const birdsWithBuddies = birdUsers.map((bird) => ({
        ...bird,
        buddies: pairsData
          .filter((pair) => pair.birdId === bird.id)
          .map((pair) => buddyUsers.find((b) => b.id === pair.buddyId))
          .filter(Boolean),
      }));

      setBirds(birdsWithBuddies);
      setBuddies(buddyUsers);
      setPairs(pairsData);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const goToChat = (userId) => {
    const adminId = auth.currentUser?.uid;
    const pairId = [adminId, userId].sort().join("_");
    navigate(`/chat/${pairId}`);
  };

  const unassignedBuddies = useMemo(() => {
    const assignedIds = new Set(pairs.map((p) => p.buddyId));
    return buddies.filter((b) => !assignedIds.has(b.id));
  }, [buddies, pairs]);
  const getBirdEmail = (birdId) =>
  birds.find((b) => b.id === birdId)?.email || "Unknown Bird";

const getBuddyEmail = (buddyId) =>
  buddies.find((b) => b.id === buddyId)?.email || "Unknown Buddy";

  

  const handleDeletePair = async (pairId) => {
    if (!window.confirm("Delete this pair?")) return;
    await deleteDoc(doc(db, "pairs", pairId));
    fetchData();
  };

  const handleEditPair = (pair) => {
    setSelectedPair(pair);
    setEditBird(pair.birdId);
    setEditBuddy(pair.buddyId);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPair) return;

    const existingPairsQuery = query(
      collection(db, "pairs"),
      where("buddyId", "==", editBuddy)
    );
    const snapshot = await getDocs(existingPairsQuery);

    if (!snapshot.empty && snapshot.docs[0].id !== selectedPair.id) {
      return alert("❌ This Buddy is already paired!");
    }

    await updateDoc(doc(db, "pairs", selectedPair.id), {
      birdId: editBird,
      buddyId: editBuddy,
    });
    setEditDialogOpen(false);
    fetchData();
  };

  // Assign UI
  const handleOpenAssignDialog = (birdId) => {
    setSelectedBirdId(birdId);
    setAssignDialogOpen(true);
  };
  const handleCloseAssignDialog = () => setAssignDialogOpen(false);
  const handleOpenRemoveDialog = (birdId) => {
    setSelectedBirdId(birdId);
    setRemoveDialogOpen(true);
  };
  const handleCloseRemoveDialog = () => setRemoveDialogOpen(false);

  const handleOpenActionsDialog = (birdId) => {
    setSelectedBirdId(birdId);
    setActionsDialogOpen(true);
  };
  const handleCloseActionsDialog = () => setActionsDialogOpen(false);

  const handleAddBuddyToBird = async (buddyId) => {
    if (!selectedBird) return;
    if (selectedBird.buddies.length >= 5) {
      return alert("This bird already has 5 buddies.");
    }
    const existingPairsQuery = query(
      collection(db, "pairs"),
      where("buddyId", "==", buddyId)
    );
    const snapshot = await getDocs(existingPairsQuery);
    if (!snapshot.empty) return alert("❌ This Buddy is already paired!");
    await addDoc(collection(db, "pairs"), {
      birdId: selectedBird.id,
      buddyId,
      createdAt: new Date(),
    });
    await fetchData();
    setAssignDialogOpen(false);
  };

  const handleRemoveBuddyFromBird = async (birdId, buddyId) => {
    const qPairs = query(
      collection(db, "pairs"),
      where("birdId", "==", birdId),
      where("buddyId", "==", buddyId)
    );
    const snap = await getDocs(qPairs);
    if (snap.empty) return alert("Pair document not found.");
    await deleteDoc(doc(db, "pairs", snap.docs[0].id));
    await fetchData();
  };

  // Filter lists by search q
  const filteredBirds = birds.filter(
    (b) =>
      b.email.toLowerCase().includes(q.trim().toLowerCase()) ||
      b.id.toLowerCase().includes(q.trim().toLowerCase())
  );
  const filteredBuddies = buddies.filter(
    (b) =>
      b.email.toLowerCase().includes(q.trim().toLowerCase()) ||
      b.id.toLowerCase().includes(q.trim().toLowerCase())
  );
  const filteredPairs = pairs.filter(
    (p) =>
      p.birdId.toLowerCase().includes(q.trim().toLowerCase()) ||
      p.buddyId.toLowerCase().includes(q.trim().toLowerCase())
  );

  if (loading)
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#0b1220",
        }}
      >
        <CircularProgress />
      </Box>
    );

  return (
    <Box sx={{ minHeight: "100vh", pb: 6, background: PALETTE.pageBg }}>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          pt: 1,
          pb: 1,
          backdropFilter: "blur(6px)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mx: { xs: 1, md: 3 },
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/profile")}
          >
            <motion.div whileHover={avatarHover} whileTap={{ scale: 0.98 }}>
              <Avatar
                sx={{
                  bgcolor: GLASS_GRADIENTS.teal.chipBg,
                  backgroundImage: GLASS_GRADIENTS.teal.avatar,
                  color: "white",
                  fontWeight: 700,
                }}
              >
                S
              </Avatar>
            </motion.div>

            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: PALETTE.textDark,
                  
                }}
              >
                🦅 Super Bird
              </Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.6)">
                Admin Dashboard
              </Typography>
            </Box>
          </Stack>


          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              placeholder="Search birds / buddies / pairs..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "gray" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                bgcolor: "rgba(255,255,255,0.06)",
                borderRadius: 2,
                width: { xs: 220, md: 360 },
                boxShadow: "0 4px 14px rgba(0,0,0,0.6)",
                input: { color: "rgba(255,255,255,0.95)" },
              }}
            />

            <Tooltip title="Logout">
              <motion.div whileTap={buttonTap}>
                <IconButton
                  color="primary"
                  onClick={handleLogout}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.06)",
                    borderRadius: 2,
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <Logout sx={{ color: "rgba(255,255,255,0.9)" }} />
                </IconButton>
              </motion.div>
            </Tooltip>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Top stats */}
      <Box mx={{ xs: 1, md: 3 }} mt={2}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
          {/* Total Birds (teal poster look) */}
          <motion.div variants={statCardVariant} initial="hidden" animate="show" style={{ flex: 1 }}>
            <GlassCard
              sx={{
                backgroundImage: GLASS_GRADIENTS.teal.background,
                backgroundBlendMode: "normal, soft-light, overlay",
                color: GLASS_GRADIENTS.teal.text,
                borderRadius: 12,
                border: GLASS_GRADIENTS.teal.border,
                p: 2,
                boxShadow: "0 10px 30px rgba(2, 60, 60, 0.18), inset 0 -6px 24px rgba(255,255,255,0.03)",
                backdropFilter: "blur(8px) saturate(110%)",
                width: "100%",
                maxWidth: 380,
                minHeight: 120,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.98 }}>
                    <Avatar
                      sx={{
                        bgcolor: GLASS_GRADIENTS.teal.chipBg,
                        color: "white",
                        backgroundImage: GLASS_GRADIENTS.teal.avatar,
                        boxShadow: "0 8px 22px rgba(3,169,244,0.16)",
                        fontWeight: 700,
                      }}
                    >
                      <PeopleIcon />
                    </Avatar>
                  </motion.div>

                  <Box>
                    <Typography variant="subtitle2" color="rgba(255,255,255,0.9)">
                      Total Birds
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: GLASS_GRADIENTS.teal.text }}>
                      {birds.length}
                    </Typography>
                  </Box>
                </Stack>
                <Chip
                  label={`${pairs.length} assigned`}
                  size="small"
                  sx={{ bgcolor: GLASS_GRADIENTS.teal.chipBg, color: "#082020", fontWeight: 700 }}
                />
              </Stack>
            </GlassCard>
          </motion.div>

          {/* Total Buddies (magenta poster look) */}
          <motion.div variants={statCardVariant} initial="hidden" animate="show" style={{ flex: 1 }}>
            <GlassCard
              sx={{
                backgroundImage: GLASS_GRADIENTS.magenta.background,
                backgroundBlendMode: "normal, soft-light, overlay",
                color: GLASS_GRADIENTS.magenta.text,
                borderRadius: 12,
                border: GLASS_GRADIENTS.magenta.border,
                p: 2,
                boxShadow: "0 10px 30px rgba(70, 0, 60, 0.16), inset 0 -6px 22px rgba(255,255,255,0.03)",
                backdropFilter: "blur(8px) saturate(110%)",
                width: "100%",
                maxWidth: 380,
                minHeight: 120,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.98 }}>
                    <Avatar
                      sx={{
                        bgcolor: GLASS_GRADIENTS.magenta.chipBg,
                        color: "white",
                        backgroundImage: GLASS_GRADIENTS.magenta.avatar,
                        boxShadow: "0 8px 22px rgba(168,85,247,0.14)",
                        fontWeight: 700,
                      }}
                    >
                      <PersonIcon />
                    </Avatar>
                  </motion.div>

                  <Box>
                    <Typography variant="subtitle2" color="rgba(255,255,255,0.9)">
                      Total Buddies
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: GLASS_GRADIENTS.magenta.text }}>
                      {buddies.length}
                    </Typography>
                  </Box>
                </Stack>
                <Chip
                  label={`${unassignedBuddies.length} unassigned`}
                  size="small"
                  sx={{ bgcolor: GLASS_GRADIENTS.magenta.chipBg, color: "#360026", fontWeight: 700 }}
                />
              </Stack>
            </GlassCard>
          </motion.div>

          {/* Quick Actions (yellow poster look with sliding pill) */}
          <motion.div variants={statCardVariant} initial="hidden" animate="show" style={{ flex: 1 }}>
            <GlassCard
              sx={{
                backgroundImage: GLASS_GRADIENTS.yellow.background,
                backgroundBlendMode: "normal, soft-light, overlay",
                color: GLASS_GRADIENTS.yellow.text,
                borderRadius: 12,
                border: GLASS_GRADIENTS.yellow.border,
                p: 2,
                boxShadow: "0 10px 32px rgba(80,50,0,0.12), inset 0 -6px 18px rgba(255,255,255,0.03)",
                backdropFilter: "blur(8px) saturate(110%)",
                width: "100%",
                maxWidth: 380,
                minHeight: 120,
              }}
            >
              <Typography variant="subtitle2" color="rgba(255,255,255,0.9)" sx={{ mb: 1 }}>
                Quick Actions
              </Typography>

              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  borderRadius: 999,
                  py: 0.5,
                  px: 0.5,
                  boxShadow: `inset 0 0 0 6px rgba(255,190,0,0.08), 0 6px 18px rgba(0,0,0,0.06)`,
                  bgcolor: GLASS_GRADIENTS.yellow.text,
                  height: 40,
                  boxSizing: "border-box",
                }}
              >
                {/* Buttons container (flex) */}
                <Box
                  ref={tabsRef}
                  sx={{
                    display: "flex",
                    width: "100%",
                    height: "100%",
                    alignItems: "center",
                    gap: 0,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {QUICK_TABS.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <Button
                        key={item.id}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setActiveTab(item.id)}
                        sx={{
                          flex: 1,
                          minWidth: 80,
                          px: 2,
                          py: 0.6,
                          borderRadius: 999,
                          textTransform: "none",
                          fontWeight: 800,
                          color: isActive ? GLASS_GRADIENTS.yellow.text : "#ffffff",
                          bgcolor: "transparent",
                          "&:focus": { boxShadow: `0 0 0 4px ${GLASS_GRADIENTS.yellow.text}22` },
                          transform: isActive ? "scale(1.02)" : "none",
                          transition: "color 180ms ease, transform 180ms ease",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        id={`qa-pill-${item.id}`}
                      >
                        {item.label}
                      </Button>
                    );
                  })}
                </Box>

                {/* measured sliding indicator (absolute) */}
                <Box
                  sx={{
                    position: "absolute",
                    top: "50%",
                    transform: "translateY(-50%)",
                    height: "calc(100% - 12px)",
                    borderRadius: 999,
                    bgcolor: "white",
                    boxShadow: "0 6px 18px rgba(20,20,40,0.08)",
                    zIndex: 0,
                    pointerEvents: "none",
                    boxSizing: "border-box",
                    left: indicatorStyle.left !== null ? `${indicatorStyle.left}px` : "6px",
                    width: indicatorStyle.width !== null ? `${indicatorStyle.width}px` : `calc((100% - 12px) / ${tabCount})`,
                    transition: "left 260ms cubic-bezier(.2,.9,.2,1), width 220ms ease",
                  }}
                />
              </Box>
            </GlassCard>
          </motion.div>
        </Stack>
      </Box>

      {/* Main area */}
      <Box mx={{ xs: 1, md: 3 }} mt={3}>
        <GlassCard>
          <Box sx={{ minHeight: 420 }}>
            {/* BIRDS */}
            {activeTab === "birds" && (
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <Box sx={{ flex: 1, maxHeight: 560, overflowY: "auto" }}>
                  {filteredBirds.length === 0 ? (
                    <Box sx={{ p: 6, textAlign: "center" }}>
                      <Typography variant="h5" sx={{ color: PALETTE.textDark }}>No birds yet 🐦</Typography>
                      <Typography color="text.secondary">Add birds or switch to Buddies tab.</Typography>
                    </Box>
                  ) : (
                    <motion.div variants={listContainer} initial="hidden" animate="show">
                      <List>
                        {filteredBirds.map((bird) => (
                          <motion.div
                            key={bird.id}
                            variants={listItemVariant}
                            whileHover={{ scale: 1.02 }}
                            style={{ marginBottom: 14 }}
                          >
                            <GlassCard
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                transition: "transform 160ms ease",
                                background: `${PALETTE.mintTeal}22`,
                                ":hover": { boxShadow: "0 12px 34px rgba(16,20,40,0.1)" },
                              }}
                            >
                              <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.98 }}>
                                <Avatar
                                  sx={{
                                    bgcolor: PALETTE.mintTeal,
                                    mr: 2,
                                    color: "white",
                                    backgroundImage:
                                      `linear-gradient(135deg, ${PALETTE.mintTeal}, ${PALETTE.softYellow})`,
                                    boxShadow: "0 6px 18px rgba(16,195,184,0.14)",
                                    fontWeight: 800,
                                  }}
                                >
                                  {bird.email?.[0]?.toUpperCase() || "B"}
                                </Avatar>
                              </motion.div>

                              <Box sx={{ flex: 1 }}>
                                <Typography sx={{ fontWeight: 800, color: PALETTE.textDark }}>{bird.email}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {bird.buddies.length} buddies • id: {bird.id}
                                </Typography>

                                <Stack direction="row" spacing={1} mt={1}>
                                  {bird.buddies.slice(0, 4).map((b) => (
                                    <Chip
                                      key={b.id}
                                      label={b.email.split("@")[0]}
                                      size="small"
                                      sx={{
                                        bgcolor: PALETTE.softYellow,
                                        color: "#3b3110",
                                        fontWeight: 700,
                                      }}
                                    />
                                  ))}
                                  {bird.buddies.length > 4 && (
                                    <Chip
                                      label={`+${bird.buddies.length - 4}`}
                                      size="small"
                                      sx={{ bgcolor: PALETTE.softYellow, color: "#3b3110", fontWeight: 700 }}
                                    />
                                  )}
                                </Stack>
                              </Box>

                              <Stack direction="column" spacing={1} alignItems="flex-end">
                                <Tooltip title="Chat with bird">
                                  <motion.div whileTap={buttonTap}>
                                    <IconButton onClick={() => goToChat(bird.id)} sx={{ bgcolor: "white" }}>
                                      <ChatIcon />
                                    </IconButton>
                                  </motion.div>
                                </Tooltip>

                                <Stack direction="row" spacing={1}>
                                  <motion.div whileTap={buttonTap}>
                                    <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<ExpandMore />}
                                    onClick={() => handleOpenActionsDialog(bird.id)}
                                    sx={{
                                      bgcolor: PALETTE.pastelPurple,
                                      color: "white",
                                      fontWeight: 800,
                                      textTransform: "none",
                                      borderRadius: 2,
                                      px: 2,
                                      "&:hover": {
                                        bgcolor: "#8577ff",
                                      },
                                    }}
                                  >
                                    Actions
                                  </Button>
                                  </motion.div>
                                </Stack>
                              </Stack>
                            </GlassCard>
                          </motion.div>
                        ))}
                      </List>
                    </motion.div>
                  )}
                </Box>
              </Stack>
            )}

            {/* BUDDIES */}
            {activeTab === "buddies" && (
              <Stack spacing={2}>
                {filteredBuddies.length === 0 ? (
                  <Box sx={{ p: 6, textAlign: "center" }}>
                    <Typography variant="h5" sx={{ color: PALETTE.textDark }}>No buddies yet 🐥</Typography>
                    <Typography color="text.secondary">Invite/ register buddies to start pairing.</Typography>
                  </Box>
                ) : (
                  <motion.div variants={listContainer} initial="hidden" animate="show">
                    <Box>
                      {filteredBuddies.map((buddy) => (
                        <motion.div key={buddy.id} variants={listItemVariant} whileHover={{ scale: 1.02 }} style={{ marginBottom: 12 }}>
                          <GlassCard
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              background: `${PALETTE.peach}22`,
                              ":hover": { boxShadow: "0 12px 34px rgba(16,20,40,0.1)" },
                            }}
                          >
                            <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.98 }}>
                              <Avatar
                                sx={{
                                  bgcolor: PALETTE.peach,
                                  mr: 2,
                                  color: "white",
                                  backgroundImage:
                                    `linear-gradient(135deg, ${PALETTE.peach}, ${PALETTE.softYellow})`,
                                  boxShadow: "0 6px 18px rgba(255,146,102,0.12)",
                                  fontWeight: 800,
                                }}
                              >
                                {buddy.email?.[0]?.toUpperCase()}
                              </Avatar>
                            </motion.div>

                            <Box sx={{ flex: 1 }}>
                              <Typography sx={{ fontWeight: 800, color: PALETTE.textDark }}>{buddy.email}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                id: {buddy.id}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={1}>
                              <motion.div whileTap={buttonTap}>
                                <Button
                                  size="small"
                                  onClick={() => goToChat(buddy.id)}
                                  startIcon={<ChatIcon />}
                                  sx={{
                                    bgcolor: "white",
                                    fontWeight: 700,
                                    ":hover": { bgcolor: "#fffaf5" },
                                  }}
                                >
                                  Chat
                                </Button>
                              </motion.div>
                            </Stack>
                          </GlassCard>
                        </motion.div>
                      ))}
                    </Box>
                  </motion.div>
                )}
              </Stack>
            )}

            {/* PAIRS */}
            {activeTab === "pairs" && (
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="h5" sx={{ color: PALETTE.textDark }}>Pairs 🔗</Typography>
                  <motion.div whileTap={buttonTap}>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => navigate("/create-pair")}
                      sx={{ ...pill, bgcolor: PALETTE.pastelPurple, color: "white", fontWeight: 800 }}
                    >
                      New Pair
                    </Button>
                  </motion.div>
                </Stack>

                {filteredPairs.length === 0 ? (
                  <Box sx={{ p: 6, textAlign: "center" }}>
                    <Typography variant="h5" sx={{ color: PALETTE.textDark }}>No pairs yet 🔗</Typography>
                    <Typography color="text.secondary">Create pairs using the + button above.</Typography>
                  </Box>
                ) : (
                  <motion.div variants={listContainer} initial="hidden" animate="show">
                    {filteredPairs.map((pair) => (
                      <motion.div key={pair.id} variants={listItemVariant} whileHover={{ scale: 1.01 }} style={{ marginBottom: 12 }}>
                        <GlassCard
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: `${PALETTE.pastelPurple}22`,
                          }}
                        >
                          <Stack direction="row" spacing={2} alignItems="center">
                            <motion.div whileHover={{ scale: 1.06 }}>
                              <Avatar
                                sx={{
                                  bgcolor: PALETTE.pastelPurple,
                                  color: "white",
                                  backgroundImage:
                                    `linear-gradient(135deg, ${PALETTE.pastelPurple}, ${PALETTE.mintTeal})`,
                                  fontWeight: 800,
                                  boxShadow: "0 6px 18px rgba(162,107,255,0.12)",
                                }}
                              >
                                <LinkIcon />
                              </Avatar>
                            </motion.div>

                            <Box>
  <Tooltip title={`Bird ID: ${pair.birdId}`}>
    <Typography sx={{ fontWeight: 800, color: PALETTE.textDark }}>
      🐦 {getBirdEmail(pair.birdId)}
    </Typography>
  </Tooltip>

  <Tooltip title={`Buddy ID: ${pair.buddyId}`}>
    <Typography variant="caption" color="text.secondary">
      🧑‍🎓 {getBuddyEmail(pair.buddyId)}
    </Typography>
  </Tooltip>
</Box>

                          </Stack>

                          <Stack direction="row" spacing={1}>
                            <motion.div whileTap={buttonTap}>
                              <IconButton onClick={() => handleEditPair(pair)}><Edit /></IconButton>
                            </motion.div>
                            <motion.div whileTap={buttonTap}>
                              <IconButton color="error" onClick={() => handleDeletePair(pair.id)}><DeleteIcon /></IconButton>
                            </motion.div>
                          </Stack>
                        </GlassCard>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </Stack>
            )}
            {activeTab === "reports" && (
  <Stack spacing={2}>
    <Typography variant="h5" sx={{ color: PALETTE.textDark }}>
      🚨 Reports
    </Typography>

    {reports.length === 0 ? (
      <Typography>No reports submitted.</Typography>
    ) : (
      reports.map((r) => (
        <GlassCard key={r.id}>
          <Typography fontWeight={800}>{r.reason}</Typography>

          <Typography variant="caption" display="block">
            Reporter: {r.reporterEmail}
          </Typography>

          <Typography variant="caption" display="block">
            Pair: {r.pairId}
          </Typography>

          <Chip
            label={r.status}
            color={r.status === "pending" ? "warning" : "success"}
            sx={{ mt: 1 }}
          />

          <Button
            size="small"
            sx={{ mt: 1 }}
            onClick={async () => {
              await updateDoc(doc(db, "reports", r.id), {
                status: "reviewed",
              });
              fetchData();
            }}
          >
            Mark Reviewed
          </Button>
        </GlassCard>
      ))
    )}
  </Stack>
)}
          </Box>
        </GlassCard>
      </Box>
      

      {/* Assign Buddy Dialog */}
      {/* Add Buddy Dialog */}
      
<Dialog
  open={assignDialogOpen}
  onClose={handleCloseAssignDialog}
  fullWidth
  maxWidth="sm"
  PaperProps={{
    sx: {
      borderRadius: 4,
      background: "rgba(255,255,255,0.06)",
      backdropFilter: "blur(16px) saturate(160%)",
      border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "0 30px 70px rgba(0,0,0,0.55)",
      color: PALETTE.textDark,
    },
  }}
>
  {/* ===== Header ===== */}
  <DialogTitle
    sx={{
      fontWeight: 900,
      fontSize: 18,
      letterSpacing: 0.5,
      color: PALETTE.softYellow,
      display: "flex",
      alignItems: "center",
      gap: 1,
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    }}
  >
    Add Buddy
    <Typography
      component="span"
      sx={{
        fontWeight: 600,
        opacity: 0.75,
        fontSize: 13,
      }}
    >
      — {selectedBird?.email}
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
    {unassignedBuddies.length === 0 ? (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography sx={{ fontWeight: 700 }}>
          No unassigned buddies available
        </Typography>
      </Box>
    ) : (
      <List dense>
        {unassignedBuddies.map((buddy) => (
          <ListItem
            key={buddy.id}
            sx={{
              mb: 1,
              borderRadius: 2,
              background: "rgba(255,255,255,0.04)",
              transition: "background 160ms ease",
              "&:hover": {
                background: "rgba(255,255,255,0.08)",
              },
            }}
            secondaryAction={
              <motion.div whileTap={buttonTap}>
                <Button
                  size="small"
                  onClick={() => handleAddBuddyToBird(buddy.id)}
                  sx={{
                    bgcolor: "rgba(155,140,255,0.15)",
                    color: PALETTE.softYellow,
                    fontWeight: 800,
                    textTransform: "none",
                    borderRadius: 999,
                    px: 2,
                    border: "1px solid rgba(155,140,255,0.35)",
                    backdropFilter: "blur(6px)",
                    "&:hover": {
                      bgcolor: "rgba(155,140,255,0.25)",
                    },
                  }}
                >
                  Add
                </Button>
              </motion.div>
            }
          >
            <ListItemText
              primary={buddy.email}
              primaryTypographyProps={{
                fontWeight: 700,
              }}
            />
          </ListItem>
        ))}
      </List>
    )}
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
      onClick={handleCloseAssignDialog}
      sx={{
        color: PALETTE.softYellow,
        fontWeight: 700,
        textTransform: "none",
      }}
    >
      Close
    </Button>
  </DialogActions>
</Dialog>



      {/* Actions dialog */}
      
<Dialog
  open={actionsDialogOpen}
  onClose={handleCloseActionsDialog}
  fullWidth
  maxWidth="sm"
  PaperProps={{
    sx: {
      borderRadius: 4,
      background: "rgba(255,255,255,0.06)",
      backdropFilter: "blur(16px) saturate(160%)",
      border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "0 30px 70px rgba(0,0,0,0.55)",
      color: PALETTE.textDark,
    },
  }}
>
  {/* ===== Header ===== */}
  <DialogTitle
    sx={{
      fontWeight: 900,
      fontSize: 18,
      letterSpacing: 0.5,
      color: PALETTE.softYellow,
      display: "flex",
      alignItems: "center",
      gap: 1,
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    }}
  >
    Manage Class
    <Typography
      component="span"
      sx={{ fontWeight: 600, opacity: 0.75, fontSize: 13 }}
    >
      — {selectedBird?.email}
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
    <Stack spacing={3}>
      {/* Assigned Buddies (GLASS BOX) */}
      <Box
        sx={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(14px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 2,
          p: 2,
        }}
      >
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: 13,
            color: PALETTE.softYellow,
            textTransform: "uppercase",
            letterSpacing: 1,
            mb: 1,
          }}
        >
          Assigned Buddies
        </Typography>

        {selectedBird?.buddies?.length > 0 ? (
          <List dense>
            {selectedBird.buddies.map((b) => (
              <ListItem
                key={b.id}
                sx={{
                  borderRadius: 1.5,
                  background: "rgba(255,255,255,0.04)",
                  mb: 0.5,
                }}
              >
                <ListItemText
                  primary={b.email}
                  primaryTypographyProps={{ fontWeight: 700 }}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography>No assigned buddies</Typography>
        )}

        <Button
          fullWidth
          onClick={() => {
            setRemoveDialogOpen(true);
            setActionsDialogOpen(false);
          }}
          disabled={!selectedBird || selectedBird?.buddies?.length === 0}
          sx={{
            mt: 1,
            bgcolor: "rgba(255,70,90,0.15)",
            color: "#ff6e84",
            fontWeight: 800,
            textTransform: "none",
            borderRadius: 2,
            border: "1px solid rgba(255,70,90,0.35)",
            "&:hover": {
              bgcolor: "rgba(255,70,90,0.25)",
            },
          }}
        >
          Remove Buddy
        </Button>
      </Box>

      {/* Unassigned Buddies (GLASS BOX) */}
      <Box
        sx={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(14px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 2,
          p: 2,
        }}
      >
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: 13,
            color: PALETTE.softYellow,
            textTransform: "uppercase",
            letterSpacing: 1,
            mb: 1,
          }}
        >
          Unassigned Buddies
        </Typography>

        {unassignedBuddies.length > 0 ? (
          <List dense>
            {unassignedBuddies.map((b) => (
              <ListItem
                key={b.id}
                sx={{
                  borderRadius: 1.5,
                  background: "rgba(255,255,255,0.04)",
                  mb: 0.5,
                }}
              >
                <ListItemText
                  primary={b.email}
                  primaryTypographyProps={{ fontWeight: 700 }}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography>All buddies are assigned</Typography>
        )}

        <Button
          fullWidth
          onClick={() => {
            setAssignDialogOpen(true);
            setActionsDialogOpen(false);
          }}
          disabled={
            !selectedBird ||
            selectedBird?.buddies?.length >= 5 ||
            unassignedBuddies.length === 0
          }
          sx={{
            mt: 1,
            bgcolor: "rgba(155,140,255,0.15)",
            color: PALETTE.softYellow,
            fontWeight: 800,
            textTransform: "none",
            borderRadius: 2,
            border: "1px solid rgba(155,140,255,0.35)",
            "&:hover": {
              bgcolor: "rgba(155,140,255,0.25)",
            },
          }}
        >
          Add Buddy
        </Button>
      </Box>
    </Stack>
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
      onClick={handleCloseActionsDialog}
      sx={{
        color: PALETTE.softYellow,
        fontWeight: 700,
        textTransform: "none",
      }}
    >
      Close
    </Button>
  </DialogActions>
</Dialog>


      {/* Remove Buddy Dialog */}
      <Dialog
  open={removeDialogOpen}
  onClose={handleCloseRemoveDialog}
  fullWidth
  maxWidth="sm"
  PaperProps={{
    sx: {
      borderRadius: 4,
      background: "rgba(255,255,255,0.06)",
      backdropFilter: "blur(16px) saturate(160%)",
      border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "0 30px 70px rgba(0,0,0,0.55)",
      color: PALETTE.textDark,
    },
  }}
>
  {/* ===== Header ===== */}
  <DialogTitle
    sx={{
      fontWeight: 900,
      fontSize: 18,
      letterSpacing: 0.5,
      color: PALETTE.softYellow,
      display: "flex",
      alignItems: "center",
      gap: 1,
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    }}
  >
    Remove Buddy
    <Typography
      component="span"
      sx={{
        fontWeight: 600,
        opacity: 0.75,
        fontSize: 13,
      }}
    >
      — {selectedBird?.email}
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
    {selectedBird && selectedBird.buddies.length > 0 ? (
      <List dense>
        {selectedBird.buddies.map((b) => (
          <ListItem
            key={b.id}
            sx={{
              mb: 1,
              borderRadius: 2,
              background: "rgba(255,255,255,0.04)",
              transition: "background 160ms ease",
              "&:hover": {
                background: "rgba(255,255,255,0.08)",
              },
            }}
            secondaryAction={
              <motion.div whileTap={buttonTap}>
                <Button
                  size="small"
                  onClick={async () => {
                    await handleRemoveBuddyFromBird(
                      selectedBird.id,
                      b.id
                    );
                    handleCloseRemoveDialog();
                  }}
                  sx={{
                    bgcolor: "rgba(255,70,90,0.15)",
                    color: "#ff6e84ff",
                    fontWeight: 800,
                    textTransform: "none",
                    borderRadius: 999,
                    px: 2,
                    border: "1px solid rgba(141, 0, 14, 0.35)",
                    backdropFilter: "blur(6px)",
                    "&:hover": {
                      bgcolor: "rgba(255, 0, 25, 0.25)",
                    },
                  }}
                >
                  Remove
                </Button>
              </motion.div>
            }
          >
            <ListItemText
              primary={b.email}
              primaryTypographyProps={{
                fontWeight: 700,
              }}
            />
          </ListItem>
        ))}
      </List>
    ) : (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography sx={{ fontWeight: 700 }}>
          No assigned buddies
        </Typography>
      </Box>
    )}
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
      onClick={handleCloseRemoveDialog}
      sx={{
        color: PALETTE.softYellow,
        fontWeight: 700,
        textTransform: "none",
      }}
    >
      Close
    </Button>
  </DialogActions>
</Dialog>






      {/* Edit Pair Dialog */}
      {/* Edit Pair Dialog – GLASS UI */}
<Dialog
  open={editDialogOpen}
  onClose={() => setEditDialogOpen(false)}
  fullWidth
  maxWidth="sm"
  PaperProps={{
    sx: {
      borderRadius: 4,
      background: "rgba(255,255,255,0.06)",
      backdropFilter: "blur(16px) saturate(160%)",
      border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "0 30px 70px rgba(0,0,0,0.55)",
      color: PALETTE.textDark,
    },
  }}
>
  {/* ===== Header ===== */}
  <DialogTitle
    sx={{
      fontWeight: 900,
      fontSize: 18,
      letterSpacing: 0.5,
      color: PALETTE.softYellow,
      display: "flex",
      alignItems: "center",
      gap: 1,
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    }}
  >
    Edit Pair
  </DialogTitle>

  {/* ===== Content ===== */}
  <DialogContent
    dividers
    sx={{
      px: 3,
      py: 3,
      borderColor: "rgba(255,255,255,0.06)",
    }}
  >
    <Stack spacing={3}>
      {/* Bird Selector */}
      <Box
        sx={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(14px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 2,
          p: 2,
        }}
      >
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: 13,
            color: PALETTE.softYellow,
            textTransform: "uppercase",
            letterSpacing: 1,
            mb: 1,
          }}
        >
          Bird
        </Typography>

        <FormControl fullWidth>
          <Select
            value={editBird}
            onChange={(e) => setEditBird(e.target.value)}
            sx={{
              bgcolor: "rgba(255,255,255,0.04)",
              borderRadius: 2,
              color: PALETTE.textDark,
            }}
          >
            {birds.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {b.email}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Buddy Selector */}
      <Box
        sx={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(14px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 2,
          p: 2,
        }}
      >
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: 13,
            color: PALETTE.softYellow,
            textTransform: "uppercase",
            letterSpacing: 1,
            mb: 1,
          }}
        >
          Buddy
        </Typography>

        <FormControl fullWidth>
          <Select
            value={editBuddy}
            onChange={(e) => setEditBuddy(e.target.value)}
            sx={{
              bgcolor: "rgba(255,255,255,0.04)",
              borderRadius: 2,
              color: PALETTE.textDark,
            }}
          >
            {buddies.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {b.email}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Stack>
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
      onClick={() => setEditDialogOpen(false)}
      sx={{
        color: PALETTE.softYellow,
        fontWeight: 700,
        textTransform: "none",
      }}
    >
      Cancel
    </Button>

    <motion.div whileTap={buttonTap}>
      <Button
        onClick={handleSaveEdit}
        sx={{
          ml: 1,
          bgcolor: "rgba(155,140,255,0.15)",
          color: PALETTE.softYellow,
          fontWeight: 800,
          textTransform: "none",
          borderRadius: 2,
          border: "1px solid rgba(155,140,255,0.35)",
          "&:hover": {
            bgcolor: "rgba(155,140,255,0.25)",
          },
        }}
      >
        Save Changes
      </Button>
    </motion.div>
  </DialogActions>
</Dialog>

    </Box>
  );
}
