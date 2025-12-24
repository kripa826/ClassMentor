import React, { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  Box,
  Typography,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChatIcon from "@mui/icons-material/Chat";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate } from "react-router-dom";

export default function BuddyDashboard() {
  const [user, setUser] = useState(null);
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      setUser(currentUser);

      const q = query(
        collection(db, "pairs"),
        where("buddyId", "==", currentUser.uid)
      );
      const snapshot = await getDocs(q);
      setPairs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const goToChat = (birdId) => {
    const chatId = [auth.currentUser.uid, birdId].sort().join("_");
    navigate(`/chat/${chatId}`);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #fff3e0, #fce4ec)",
        p: 4,
      }}
    >
      <Typography variant="h4" textAlign="center" mb={1}>
        🐥 Buddy Dashboard
      </Typography>

      <Typography textAlign="center" mb={4}>
        Welcome, {user?.email}
      </Typography>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="bold">Your Bird 🐦</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {pairs.length === 0 ? (
            <Typography>No bird assigned yet.</Typography>
          ) : (
            pairs.map(pair => (
              <Box key={pair.id} sx={{ mb: 2 }}>
                <Typography>Bird ID: {pair.birdId}</Typography>
                <Button
                  fullWidth
                  startIcon={<ChatIcon />}
                  sx={{ mt: 1 }}
                  onClick={() => goToChat(pair.birdId)}
                >
                  Chat
                </Button>
              </Box>
            ))
          )}
        </AccordionDetails>
      </Accordion>

      <Button
        variant="outlined"
        color="error"
        startIcon={<LogoutIcon />}
        sx={{ mt: "auto" }}
        onClick={handleLogout}
      >
        Logout
      </Button>
    </Box>
  );
}
