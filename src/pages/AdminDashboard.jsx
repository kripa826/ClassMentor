import React, { useEffect, useState } from "react";
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
  Fab,
  CircularProgress,
  Divider,
} from "@mui/material";
import { Chat, Add, Logout, Delete, Edit } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const [birds, setBirds] = useState([]);
  const [buddies, setBuddies] = useState([]);
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("birds"); // birds | buddies | pairs

  // Dialogs
  const [newBird, setNewBird] = useState("");
  const [newBuddy, setNewBuddy] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPair, setSelectedPair] = useState(null);
  const [editBird, setEditBird] = useState("");
  const [editBuddy, setEditBuddy] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const pairsSnapshot = await getDocs(collection(db, "pairs"));
      const allUsers = usersSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setBirds(allUsers.filter((u) => u.role === "bird"));
      setBuddies(allUsers.filter((u) => u.role === "buddy"));
      setPairs(pairsSnapshot.docs.map((p) => ({ id: p.id, ...p.data() })));
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

  const handleCreatePair = async () => {
    if (!newBird || !newBuddy) {
      alert("Please select both Bird and Buddy!");
      return;
    }

    const existingPairsQuery = query(
      collection(db, "pairs"),
      where("buddyId", "==", newBuddy)
    );
    const snapshot = await getDocs(existingPairsQuery);
    if (!snapshot.empty) {
      alert("❌ This Buddy is already paired!");
      return;
    }

    await addDoc(collection(db, "pairs"), {
      birdId: newBird,
      buddyId: newBuddy,
      createdAt: new Date(),
    });
    setDialogOpen(false);
    setNewBird("");
    setNewBuddy("");
    fetchData();
  };

  const handleDeletePair = async (pairId) => {
    if (window.confirm("Delete this pair?")) {
      await deleteDoc(doc(db, "pairs", pairId));
      fetchData();
    }
  };

  const handleEditPair = (pair) => {
    setSelectedPair(pair);
    setEditBird(pair.birdId);
    setEditBuddy(pair.buddyId);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    const existingPairsQuery = query(
      collection(db, "pairs"),
      where("buddyId", "==", editBuddy)
    );
    const snapshot = await getDocs(existingPairsQuery);

    if (!snapshot.empty && snapshot.docs[0].id !== selectedPair.id) {
      alert("❌ This Buddy is already paired!");
      return;
    }

    const pairRef = doc(db, "pairs", selectedPair.id);
    await updateDoc(pairRef, { birdId: editBird, buddyId: editBuddy });
    setEditDialogOpen(false);
    fetchData();
  };

  if (loading)
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#f0f7ff",
        }}
      >
        <CircularProgress />
      </Box>
    );

  return (
    <Box sx={{ bgcolor: "#f0f7ff", minHeight: "100vh" }}>
      {/* 🩵 Top Bar */}
      <AppBar position="sticky" color="primary" sx={{ borderRadius: 0 }}>
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            🦅 Super Bird
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* 🪶 Toggle Tabs */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: 2,
          mt: 3,
        }}
      >
        {["birds", "buddies", "pairs"].map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "contained" : "outlined"}
            color="primary"
            onClick={() => setActiveTab(tab)}
          >
            {tab === "birds"
              ? "Birds 🐦"
              : tab === "buddies"
              ? "Buddies 🐥"
              : "Pairs 🔗"}
          </Button>
        ))}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* 📋 List Sections */}
      <Box sx={{ px: 3, pb: 10 }}>
        {/* Birds Section */}
        {activeTab === "birds" && (
          <Box>
            {birds.length === 0 ? (
              <Typography>No birds yet.</Typography>
            ) : (
              birds.map((bird) => (
                <Paper
                  key={bird.id}
                  sx={{
                    p: 2,
                    my: 1,
                    borderRadius: 3,
                    bgcolor: "#fff",
                    boxShadow: 3,
                  }}
                >
                  <Typography variant="body1">{bird.email}</Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ mt: 1 }}
                    startIcon={<Chat />}
                    onClick={() => goToChat(bird.id)}
                  >
                    Chat 💬
                  </Button>
                </Paper>
              ))
            )}
          </Box>
        )}

        {/* Buddies Section */}
        {activeTab === "buddies" && (
          <Box>
            {buddies.length === 0 ? (
              <Typography>No buddies yet.</Typography>
            ) : (
              buddies.map((buddy) => (
                <Paper
                  key={buddy.id}
                  sx={{
                    p: 2,
                    my: 1,
                    borderRadius: 3,
                    bgcolor: "#fff",
                    boxShadow: 3,
                  }}
                >
                  <Typography variant="body1">{buddy.email}</Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ mt: 1 }}
                    startIcon={<Chat />}
                    onClick={() => goToChat(buddy.id)}
                  >
                    Chat 💬
                  </Button>
                </Paper>
              ))
            )}
          </Box>
        )}

        {/* Pairs Section */}
        {activeTab === "pairs" && (
          <Box>
            {pairs.length === 0 ? (
              <Typography>No pairs yet.</Typography>
            ) : (
              pairs.map((pair) => (
                <Paper
                  key={pair.id}
                  sx={{
                    p: 2,
                    my: 1,
                    borderRadius: 3,
                    bgcolor: "#fff",
                    boxShadow: 3,
                  }}
                >
                  <Typography variant="body2">
                    <b>Bird ID:</b> {pair.birdId}
                  </Typography>
                  <Typography variant="body2">
                    <b>Buddy ID:</b> {pair.buddyId}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      mt: 1,
                    }}
                  >
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => handleEditPair(pair)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDeletePair(pair.id)}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </Paper>
              ))
            )}

            {/* ➕ Add Pair Button inside Pairs tab */}
            <Button
              variant="contained"
              startIcon={<Add />}
              fullWidth
              sx={{ mt: 3 }}
              onClick={() => setDialogOpen(true)}
            >
              Add New Pair 🔗
            </Button>
          </Box>
        )}
      </Box>

      {/* 🧾 Create Pair Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth>
        <DialogTitle>Create New Pair 🔗</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Bird</InputLabel>
            <Select
              value={newBird}
              onChange={(e) => setNewBird(e.target.value)}
              label="Bird"
            >
              {birds.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Buddy</InputLabel>
            <Select
              value={newBuddy}
              onChange={(e) => setNewBuddy(e.target.value)}
              label="Buddy"
            >
              {buddies.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreatePair}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🧾 Edit Pair Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth>
        <DialogTitle>Edit Pair</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Bird</InputLabel>
            <Select
              value={editBird}
              onChange={(e) => setEditBird(e.target.value)}
            >
              {birds.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Buddy</InputLabel>
            <Select
              value={editBuddy}
              onChange={(e) => setEditBuddy(e.target.value)}
            >
              {buddies.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

