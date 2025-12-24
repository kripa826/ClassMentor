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
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { useNavigate, Link } from "react-router-dom";

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
          maxWidth: 460,
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
          Create Account ✨
        </Typography>

        <Typography
          sx={{
            color: "rgba(255,255,255,0.6)",
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
              color: "#fff",
              backgroundColor:
                role === "superbird"
                  ? "#EC4899"
                  : role === "bird"
                  ? "#4FB3A6"
                  : "#F5C56B",
            },
          }}
        >
          <ToggleButton value="superbird">🦅 Super Bird</ToggleButton>
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
            input: { color: "#E6EEF2" },
            label: { color: "rgba(255,255,255,0.6)" },
            fieldset: { borderColor: "rgba(255,255,255,0.15)" },
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
                input: { color: "#E6EEF2" },
                label: { color: "rgba(255,255,255,0.6)" },
                fieldset: { borderColor: "rgba(255,255,255,0.15)" },
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
                  color: "rgba(255,255,255,0.6)",
                },
                "& .MuiOutlinedInput-root": {
                  background: "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(12px)",
                  "& fieldset": {
                    borderColor: "rgba(255,255,255,0.15)",
                  },
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
            input: { color: "#E6EEF2" },
            label: { color: "rgba(255,255,255,0.6)" },
            fieldset: { borderColor: "rgba(255,255,255,0.15)" },
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
          onClick={handleSignup}
          disabled={loading}
          sx={{
            py: 1.4,
            fontWeight: 800,
            borderRadius: 2,
            fontSize: "1rem",
            background:
              role === "superbird"
                ? "linear-gradient(135deg, #EC4899, #7B61FF)"
                : role === "bird"
                ? "linear-gradient(135deg, #4FB3A6, #7B61FF)"
                : "linear-gradient(135deg, #F5C56B, #7B61FF)",
            color: "#fff",
          }}
        >
          {loading ? <CircularProgress size={24} /> : "Create Account"}
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
    </Box>
  );
}
