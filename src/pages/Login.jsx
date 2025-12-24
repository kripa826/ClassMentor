import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Paper,
} from "@mui/material";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0b1220 0%, #0f1724 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 420,
          p: 4,
          borderRadius: 3,
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: 900, color: "#E6EEF2", textAlign: "center", mb: 1 }}
        >
          ClassMentor 🪶
        </Typography>

        <Typography
          sx={{
            color: "rgba(255,255,255,0.6)",
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
            input: { color: "#E6EEF2" },
            label: { color: "rgba(255,255,255,0.6)" },
            fieldset: { borderColor: "rgba(255,255,255,0.15)" },
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
            input: { color: "#E6EEF2" },
            label: { color: "rgba(255,255,255,0.6)" },
            fieldset: { borderColor: "rgba(255,255,255,0.15)" },
          }}
        />

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
            py: 1.4,
            fontWeight: 800,
            borderRadius: 2,
            fontSize: "1rem",
            background: "linear-gradient(135deg, #7B61FF, #4FB3A6)",
            color: "#fff",
            "&:hover": {
              background: "linear-gradient(135deg, #6a54e8, #45a897)",
            },
          }}
        >
          {loading ? <CircularProgress size={24} /> : "Login"}
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
    </Box>
  );
}
