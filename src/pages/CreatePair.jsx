// src/pages/CreatePair.jsx
import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Box, TextField, Button, Typography, Paper } from "@mui/material";

export default function CreatePair() {
  const [birdId, setBirdId] = useState("");
  const [buddyId, setBuddyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleCreatePair = async () => {
    if (!birdId || !buddyId) {
      setMessage("Please enter both Bird and Buddy IDs");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await addDoc(collection(db, "pairs"), {
        birdId,
        buddyId,
        createdAt: serverTimestamp(),
      });

      setMessage("✅ Pair created successfully!");
      setBirdId("");
      setBuddyId("");
    } catch (err) {
      setMessage("❌ Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
      }}
    >
      <Paper sx={{ p: 4, width: 400, textAlign: "center", borderRadius: 3 }}>
        <Typography variant="h5" gutterBottom>
          Create Bird–Buddy Pair
        </Typography>

        <TextField
          label="Bird UID"
          fullWidth
          margin="normal"
          value={birdId}
          onChange={(e) => setBirdId(e.target.value)}
        />

        <TextField
          label="Buddy UID"
          fullWidth
          margin="normal"
          value={buddyId}
          onChange={(e) => setBuddyId(e.target.value)}
        />

        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          onClick={handleCreatePair}
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Pair"}
        </Button>

        {message && (
          <Typography sx={{ mt: 2 }} color="textSecondary">
            {message}
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
