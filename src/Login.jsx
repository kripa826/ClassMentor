import React, { useState } from "react";
import {
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { useNavigate } from "react-router-dom";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState("buddy"); // default role

  const navigate = useNavigate();

  const handleAuth = async () => {
    setLoading(true);
    setError("");
    try {
      if (isSignup) {
        // 🟢 SIGN UP
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCred.user.uid;

        // Save user data in Firestore
        await setDoc(doc(db, "users", uid), {
          email,
          role,
          createdAt: new Date(),
        });

        alert(`✅ ${role.toUpperCase()} account created successfully!`);
        setIsSignup(false);
      } else {
        // 🟣 LOGIN
        await signInWithEmailAndPassword(auth, email, password);
        onLogin && onLogin();
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #c9e4ff 0%, #e0f7fa 100%)",
        p: 3,
      }}
    >
      {/* Header */}
      <Typography
        variant="h3"
        sx={{ fontWeight: "bold", mb: 2, color: "#0078ff", textAlign: "center" }}
      >
        ClassMentor 🪶
      </Typography>
      <Typography
        variant="body1"
        sx={{ mb: 3, color: "#333", textAlign: "center" }}
      >
        {isSignup ? "Create your account" : "Welcome back! Please log in."}
      </Typography>

      {/* Role Selector (Signup only) */}
      {isSignup && (
        <Box sx={{ mb: 2, width: "100%", maxWidth: 400 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Select your role:
          </Typography>
          <ToggleButtonGroup
            value={role}
            exclusive
            onChange={(e, newRole) => newRole && setRole(newRole)}
            fullWidth
          >
            <ToggleButton value="superbird">Super Bird 🦅</ToggleButton>
            <ToggleButton value="bird">Bird 🐦</ToggleButton>
            <ToggleButton value="buddy">Buddy 🐥</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      {/* Email & Password Inputs */}
      <TextField
        fullWidth
        maxWidth={400}
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        maxWidth={400}
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        sx={{ mb: 2 }}
      />

      {/* Error Message */}
      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* Auth Button */}
      <Button
        variant="contained"
        color="primary"
        onClick={handleAuth}
        disabled={loading}
        sx={{
          width: "100%",
          maxWidth: 400,
          py: 1.3,
          fontSize: "1rem",
          borderRadius: 2,
        }}
      >
        {loading ? (
          <CircularProgress size={24} color="inherit" />
        ) : isSignup ? (
          "Sign Up"
        ) : (
          "Login"
        )}
      </Button>

      {/* Switch Login/Signup */}
      <Typography variant="body2" sx={{ mt: 3, textAlign: "center", color: "#333" }}>
        {isSignup ? "Already have an account?" : "New here?"}{" "}
        <span
          style={{ color: "#0078ff", fontWeight: "bold", cursor: "pointer" }}
          onClick={() => setIsSignup(!isSignup)}
        >
          {isSignup ? "Login" : "Create Account"}
        </span>
      </Typography>
    </Box>
  );
}
