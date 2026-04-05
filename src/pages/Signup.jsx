import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  MenuItem,
} from "@mui/material";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { useNavigate, Link } from "react-router-dom";
import { PALETTE } from "../constants/theme";

export default function Signup() {
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("buddy");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSignup = async () => {
    // 🔐 Validation based on role
    if (!name || !email || !password) {
      setError("Please fill all required fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (role === "buddy" && (!course || !year)) {
      setError("Please fill course and year");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      const userData = {
        name,
        email,
        role,
        createdAt: new Date(),
      };

      // ✅ Only buddies have course & year
      if (role === "buddy") {
        userData.course = course;
        userData.year = year;
      }

      await setDoc(doc(db, "users", cred.user.uid), userData);

      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (role === "buddy" && (!course || !year)) {
      setError("Please fill course and year before signing up with Google");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const user = cred.user;

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const userData = {
          name: user.displayName || name || "User",
          email: user.email,
          role,
          createdAt: new Date(),
        };

        if (role === "buddy") {
          userData.course = course;
          userData.year = year;
        }

        await setDoc(docRef, userData);
      }

      // After a successful signup and db creation, we can redirect directly to the dashboard
      // because the user is now authenticated and their role is in the DB.
      if (role === "superbird") navigate("/admin");
      else if (role === "bird") navigate("/bird-dashboard");
      else navigate("/buddy-dashboard");
    } catch (err) {
      console.error("Google Signup Error:", err);
      setError("Google sign-up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ... inside Signup component return ...
  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: `radial-gradient(circle at top right, #38276f 0%, #063149 40%, #0f1724 100%)`, // Purple-tinted variant of the login bg
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
        background: "radial-gradient(circle, rgba(94,209,198,0.1) 0%, rgba(0,0,0,0) 70%)",
        animation: "pulse 8s infinite alternate",
        zIndex: 0,
      }} />
      <Box sx={{
        position: "absolute", bottom: "-20%", right: "-10%", width: "50vw", height: "50vw",
        background: "radial-gradient(circle, rgba(155,140,255,0.15) 0%, rgba(0,0,0,0) 70%)",
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
          maxWidth: 480, // slightly wider for split fields later
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
          Create Account ✨
        </Typography>

        <Typography
          sx={{
            color: "rgba(255,255,255,0.7)",
            textAlign: "center",
            mb: 3,
          }}
        >
          Choose your role & get started
        </Typography>

        {/* ROLE SELECTOR */}
        <ToggleButtonGroup
          value={role}
          exclusive
          onChange={(e, v) => v && setRole(v)}
          fullWidth
          sx={{
            mb: 2,
            "& .MuiToggleButton-root": {
              color: "#E6EEF2",
              borderColor: "rgba(255,255,255,0.12)",
              fontWeight: 700,
            },
            "& .Mui-selected": {
              color: "#fff !important",
              backgroundColor:
                role === "bird"
                  ? "#4FB3A6"
                  : "#F5C56B",
            },
          }}
        >
          <ToggleButton value="bird">🐦 Bird</ToggleButton>
          <ToggleButton value="buddy">🐥 Buddy</ToggleButton>
        </ToggleButtonGroup>

        {/* NAME */}
        <TextField
          fullWidth
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
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

        {/* BUDDY-ONLY FIELDS */}
        {role === "buddy" && (
          <>
            <TextField
              fullWidth
              label="Course"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
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
              select
              fullWidth
              label="Year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              SelectProps={{
                MenuProps: {
                  PaperProps: {
                    sx: {
                      background: "rgba(15, 23, 42, 0.9)",
                      backdropFilter: "blur(12px)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.12)",
                    },
                  },
                },
              }}
              sx={{
                mb: 2,
                "& .MuiInputBase-input": { color: "#fff" },
                "& .MuiInputLabel-root": {
                  color: "rgba(255,255,255,0.7)",
                },
                "& .MuiOutlinedInput-root": {
                  background: "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(12px)",
                  "& fieldset": {
                    borderColor: "rgba(255,255,255,0.3)",
                  },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.5)" },
                  "&.Mui-focused fieldset": { borderColor: "#4FB3A6" },
                },
              }}
            >
              <MenuItem value="1st Year">1st Year</MenuItem>
              <MenuItem value="2nd Year">2nd Year</MenuItem>
              <MenuItem value="3rd Year">3rd Year</MenuItem>
            </TextField>
          </>
        )}

        {/* EMAIL */}
        <TextField
          fullWidth
          label="Email"
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

        {/* PASSWORD */}
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

        {error && (
          <Typography color="error" sx={{ mb: 2, textAlign: "center" }}>
            {error}
          </Typography>
        )}

        <Button
          fullWidth
          onClick={handleSignup}
          disabled={loading}
          sx={{
            py: 1.6,
            mt: 1,
            fontWeight: 800,
            borderRadius: 3,
            fontSize: "1rem",
            textTransform: "none",
            letterSpacing: "0.5px",
            background:
              role === "bird"
                ? "linear-gradient(135deg, #4FB3A6 0%, #7B61FF 100%)"
                : "linear-gradient(135deg, #F5C56B 0%, #7B61FF 100%)",
            color: "#fff",
            boxShadow: "0 8px 20px rgba(123, 97, 255, 0.3)",
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 12px 25px rgba(123, 97, 255, 0.4)",
              filter: "brightness(1.1)",
            },
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Sign Up"}
        </Button>

        <Button
          fullWidth
          onClick={handleGoogleSignup}
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
          Sign up with Google
        </Button>

        <Typography
          sx={{
            mt: 3,
            textAlign: "center",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          Already have an account?{" "}
          <Link
            to="/login"
            style={{
              color: "#7B61FF",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Login
          </Link>
        </Typography>
      </Paper>
    </Box >
  );
}
