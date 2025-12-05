import React, { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  getDoc,
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

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [pairs, setPairs] = useState([]);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchPairData(currentUser.uid);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchPairData = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (!userDoc.exists()) return;

      const userRole = userDoc.data().role;
      setRole(userRole);

      let q;
      if (userRole === "bird") {
        q = query(collection(db, "pairs"), where("birdId", "==", uid));
      } else if (userRole === "buddy") {
        q = query(collection(db, "pairs"), where("buddyId", "==", uid));
      } else if (userRole === "superbird") {
        setPairs([{ admin: true }]);
        return;
      }

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const allPairs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPairs(allPairs);
      } else {
        setPairs([]);
      }
    } catch (err) {
      console.error("Error fetching pair info:", err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const goToChat = (otherUserId) => {
    const currentUserId = auth.currentUser?.uid;
    const chatId = [currentUserId, otherUserId].sort().join("_");
    navigate(`/chat/${chatId}`);
  };

  const chatWithSuperBird = () => {
    const currentUserId = auth.currentUser?.uid;
    const superBirdId = "H8E2Phu6BmOOscY9cJdl29YhkT42"; // ⚠️ replace with actual SuperBird UID
    const chatId = [currentUserId, superBirdId].sort().join("_");
    navigate(`/chat/${chatId}`);
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #c9e4ff 0%, #e0f7fa 100%)",
        p: { xs: 2, sm: 4 },
        color: "#333",
      }}
    >
      {/* Header */}
      <Typography
        variant="h4"
        textAlign="center"
        sx={{ fontWeight: "bold", mb: 1 }}
      >
        {role === "bird"
          ? "🐦 Bird Dashboard"
          : role === "buddy"
          ? "🐥 Buddy Dashboard"
          : "🦅 Super Bird Dashboard"}
      </Typography>
      <Typography
        variant="subtitle1"
        textAlign="center"
        sx={{ mb: 4, opacity: 0.8 }}
      >
        Welcome, {user?.email}
      </Typography>

      {/* Superbird Access */}
      {pairs.length > 0 && pairs[0].admin ? (
        <Button
          variant="contained"
          sx={{
            backgroundColor: "#0055cc",
            borderRadius: 3,
            p: 1.2,
            mb: 3,
          }}
          fullWidth
          onClick={() => navigate("/admin")}
        >
          Go to Admin Dashboard 🦅
        </Button>
      ) : (
        <>
          {/* Pairs Accordion */}
          <Accordion
            sx={{
              background: "rgba(255,255,255,0.8)",
              borderRadius: 2,
              mb: 2,
              boxShadow: 2,
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight="bold">
                {role === "bird" ? "Your Buddies 🐥" : "Your Bird 🐦"}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {pairs.length === 0 ? (
                <Typography>No pairs yet.</Typography>
              ) : (
                pairs.map((pair) => (
                  <Box
                    key={pair.id}
                    sx={{
                      backgroundColor: "#f1faff",
                      p: 2,
                      mb: 2,
                      borderRadius: 2,
                      boxShadow: 1,
                    }}
                  >
                    <Typography>
                      {role === "bird"
                        ? `Buddy ID: ${pair.buddyId}`
                        : `Bird ID: ${pair.birdId}`}
                    </Typography>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<ChatIcon />}
                      fullWidth
                      sx={{ mt: 1, borderRadius: 2 }}
                      onClick={() =>
                        goToChat(role === "bird" ? pair.buddyId : pair.birdId)
                      }
                    >
                      Chat 💬
                    </Button>
                  </Box>
                ))
              )}
            </AccordionDetails>
          </Accordion>

          {/* Super Bird Chat Accordion */}
          <Accordion
            sx={{
              background: "rgba(255,255,255,0.8)",
              borderRadius: 2,
              boxShadow: 2,
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight="bold">Contact Super Bird 🦅</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography sx={{ mb: 1 }}>
                Need help? Chat directly with Super Bird.
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                sx={{ borderRadius: 2 }}
                onClick={chatWithSuperBird}
              >
                Chat with Super Bird
              </Button>
            </AccordionDetails>
          </Accordion>
        </>
      )}

      {/* Logout Button */}
      <Button
        variant="outlined"
        startIcon={<LogoutIcon />}
        color="error"
        fullWidth
        sx={{
          mt: "auto",
          borderRadius: 3,
          borderColor: "#d32f2f",
          color: "#d32f2f",
          "&:hover": { backgroundColor: "#ffeaea" },
        }}
        onClick={handleLogout}
      >
        Logout
      </Button>
    </Box>
  );
}
