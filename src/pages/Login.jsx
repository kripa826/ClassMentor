import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { useNavigate, Link } from "react-router-dom";
import { PALETTE } from "../constants/theme";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Force reload auth token to ensure fresh claims after a password reset
      await userCredential.user.reload();
      const user = auth.currentUser;

      // Check if suspended
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && docSnap.data().isSuspended) {
        throw new Error("suspended");
      }

      if (docSnap.exists()) {
        const role = docSnap.data().role;
        if (role === "superbird") navigate("/admin");
        else if (role === "bird") navigate("/bird-dashboard");
        else navigate("/buddy-dashboard");
      }
    } catch (err) {
      console.error("Login Error:", err);
      // If manually thrown or permission denied (likely due to App.js signOut race)
      if (err.message.includes("suspended") || err.code === "permission-denied") {
        await auth.signOut();
        setError("Your account has been suspended by the administrator.");
      } else {
        setError("Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await auth.signOut();
        throw new Error("account-not-found");
      }

      if (docSnap.exists() && docSnap.data().isSuspended) {
        throw new Error("suspended");
      }

      const role = docSnap.data().role;
      if (role === "superbird") navigate("/admin");
      else if (role === "bird") navigate("/bird-dashboard");
      else navigate("/buddy-dashboard");
    } catch (err) {
      console.error("Google Login Error:", err);
      if (err.message.includes("account-not-found")) {
        setError("Account not found. Please create an account first.");
      } else if (err.message.includes("suspended") || (err.code && err.code.includes("permission-denied"))) {
        await auth.signOut();
        setError("Your account has been suspended by the administrator.");
      } else {
        setError("Google sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      setResetError("Please enter your email address.");
      return;
    }
    setResetLoading(true);
    setResetError("");
    setResetMessage("");
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage("Password reset email sent! Check your inbox.");
      setTimeout(() => {
        setResetOpen(false);
        setResetMessage("");
        setResetEmail("");
      }, 3000);
    } catch (err) {
      console.error("Reset Error:", err);
      // Firebase throws specific codes for invalid emails, etc. You can catch them or just show err.message
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  // ... inside Login component return ...
  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: `radial-gradient(circle at top left, #0a4f6e 0%, #063149 40%, #0f1724 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated glowing orbs */}
      <Box sx={{
        position: "absolute", top: "-10%", left: "-10%", width: "40vw", height: "40vw",
        background: "radial-gradient(circle, rgba(94,209,198,0.15) 0%, rgba(0,0,0,0) 70%)",
        animation: "pulse 8s infinite alternate",
        zIndex: 0,
      }} />
      <Box sx={{
        position: "absolute", bottom: "-20%", right: "-10%", width: "50vw", height: "50vw",
        background: "radial-gradient(circle, rgba(155,140,255,0.12) 0%, rgba(0,0,0,0) 70%)",
        animation: "pulse 10s infinite alternate-reverse",
        zIndex: 0,
      }} />
      <style>
        {`@keyframes pulse { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(1.1); opacity: 1; } }`}
      </style>
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 420,
          p: { xs: 3, md: 5 },
          borderRadius: 4,
          background: "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
          backdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 30px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 900,
            color: "#FFFFFF",
            textAlign: "center",
            mb: 1,
            letterSpacing: "-0.5px",
            textShadow: "0 2px 10px rgba(0,0,0,0.3)"
          }}
        >
          ClassMentor 🪶
        </Typography>

        <Typography
          sx={{
            color: "rgba(255,255,255,0.7)",
            textAlign: "center",
            mb: 3,
          }}
        >
          Login to your account
        </Typography>

        <TextField
          fullWidth
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{
            mb: 2,
            input: { color: "#FFFFFF" },
            label: { color: "rgba(255,255,255,0.7)" },
            fieldset: { borderColor: "rgba(255,255,255,0.3)" },
            "& .MuiOutlinedInput-root": {
              "&:hover fieldset": { borderColor: "rgba(255,255,255,0.5)" },
              "&.Mui-focused fieldset": { borderColor: "#4FB3A6" },
            },
          }}
        />

        <TextField
          fullWidth
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{
            mb: 2,
            input: { color: "#FFFFFF" },
            label: { color: "rgba(255,255,255,0.7)" },
            fieldset: { borderColor: "rgba(255,255,255,0.3)" },
            "& .MuiOutlinedInput-root": {
              "&:hover fieldset": { borderColor: "rgba(255,255,255,0.5)" },
              "&.Mui-focused fieldset": { borderColor: "#4FB3A6" },
            },
          }}
        />

        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Typography
            variant="body2"
            sx={{
              color: "#4FB3A6",
              cursor: "pointer",
              fontWeight: 600,
              "&:hover": { textDecoration: "underline" },
            }}
            onClick={() => {
              setResetOpen(true);
              setResetEmail(email); // prepopulate if they already typed it
            }}
          >
            Forgot Password?
          </Typography>
        </Box>

        {error && (
          <Typography color="error" sx={{ mb: 2, textAlign: "center" }}>
            {error}
          </Typography>
        )}

        <Button
          fullWidth
          onClick={handleLogin}
          disabled={loading}
          sx={{
            py: 1.6,
            fontWeight: 800,
            borderRadius: 3,
            fontSize: "1rem",
            textTransform: "none",
            letterSpacing: "0.5px",
            background: "linear-gradient(135deg, #7B61FF 0%, #4FB3A6 100%)",
            color: "#fff",
            boxShadow: "0 8px 20px rgba(79, 179, 166, 0.3)",
            transition: "all 0.3s ease",
            "&:hover": {
              background: "linear-gradient(135deg, #8B75FF 0%, #5EC9BB 100%)",
              transform: "translateY(-2px)",
              boxShadow: "0 12px 25px rgba(79, 179, 166, 0.4)",
            },
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Sign In"}
        </Button>

        <Button
          fullWidth
          onClick={handleGoogleLogin}
          disabled={loading}
          sx={{
            py: 1.6,
            mt: 2,
            fontWeight: 700,
            borderRadius: 3,
            fontSize: "1rem",
            textTransform: "none",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#FFFFFF",
            transition: "all 0.3s ease",
            "&:hover": {
              background: "rgba(255,255,255,0.1)",
              transform: "translateY(-2px)",
            },
          }}
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
            alt="Google"
            style={{ width: 22, height: 22, marginRight: 12 }}
          />
          Continue with Google
        </Button>

        <Typography
          sx={{
            mt: 3,
            textAlign: "center",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          New here?{" "}
          <Link
            to="/signup"
            style={{
              color: "#7B61FF",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Create account
          </Link>
        </Typography>
      </Paper>

      {/* FORGOT PASSWORD DIALOG */}
      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        PaperProps={{
          sx: {
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff",
            borderRadius: 3,
            minWidth: 320,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#E6EEF2" }}>
          Reset Password
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "rgba(255,255,255,0.7)", mb: 2 }}>
            Enter your email address and we will send you a link to reset your password.
          </DialogContentText>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            sx={{
              input: { color: "#E6EEF2" },
              label: { color: "rgba(255,255,255,0.6)" },
              fieldset: { borderColor: "rgba(255,255,255,0.2)" },
            }}
          />
          {resetError && (
            <Typography color="error" variant="caption" sx={{ display: "block", mt: 1 }}>
              {resetError}
            </Typography>
          )}
          {resetMessage && (
            <Typography sx={{ color: "#4FB3A6", mt: 1, fontWeight: 600, fontSize: "0.85rem" }}>
              {resetMessage}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setResetOpen(false)}
            sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleResetPassword}
            disabled={resetLoading}
            variant="contained"
            sx={{
              background: "linear-gradient(135deg, #7B61FF, #4FB3A6)",
              fontWeight: 800,
            }}
          >
            {resetLoading ? <CircularProgress size={20} color="inherit" /> : "Send Link"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
