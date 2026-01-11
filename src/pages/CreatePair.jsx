import React, { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Box, Paper, Typography, Button, MenuItem, Select, FormControl } from "@mui/material";

export default function CreatePair() {
  const [birds, setBirds] = useState([]);
  const [buddies, setBuddies] = useState([]);
  const [birdId, setBirdId] = useState("");
  const [buddyId, setBuddyId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const usersSnap = await getDocs(collection(db, "users"));
    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    setBirds(users.filter(u => u.role === "bird"));
    setBuddies(users.filter(u => u.role === "buddy"));
  };

  const handleCreatePair = async () => {
    if (!birdId || !buddyId) return setMessage("❌ Please select both Bird & Buddy");

    // Prevent duplicate assignment
    const existing = await getDocs(
      query(collection(db, "pairs"), where("buddyId", "==", buddyId))
    );
    if (!existing.empty) return setMessage("⚠ This buddy is already paired");

    // Create pair
    const pairRef = await addDoc(collection(db, "pairs"), {
      birdId,
      buddyId,
      createdAt: serverTimestamp()
    });

    // Create notification 🎯
    await addDoc(collection(db, "notifications"), {
      userId: buddyId,
      title: "New Mentor Assigned",
      message: `You have been assigned to Bird ID: ${birdId}`,
      pairId: pairRef.id,
      seen: false,
      createdAt: serverTimestamp()
    });

    setMessage("✅ Pair created & notification sent 🎉");
    setBirdId("");
    setBuddyId("");
  };

  return (
    <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b1220" }}>
      <Paper sx={{ p: 4, width: 420, borderRadius: 3, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>
          Create New Pair
        </Typography>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <Select value={birdId} onChange={e => setBirdId(e.target.value)} displayEmpty>
            <MenuItem value="" disabled>Select Bird</MenuItem>
            {birds.map(b => <MenuItem key={b.id} value={b.id}>{b.email}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <Select value={buddyId} onChange={e => setBuddyId(e.target.value)} displayEmpty>
            <MenuItem value="" disabled>Select Buddy</MenuItem>
            {buddies.map(b => <MenuItem key={b.id} value={b.id}>{b.email}</MenuItem>)}
          </Select>
        </FormControl>

        <Button sx={{ mt: 3 }} variant="contained" onClick={handleCreatePair}>
          Create Pair
        </Button>

        {message && <Typography sx={{ mt: 2 }}>{message}</Typography>}
      </Paper>
    </Box>
  );
}