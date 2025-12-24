import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  CircularProgress,
  Stack,
  Divider,
  Button,
  TextField,
  MenuItem,
} from "@mui/material";
import { auth, db, storage } from "../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    course: "",
    year: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setUserData(snap.data());
        setForm({
          name: snap.data().name || "",
          course: snap.data().course || "",
          year: snap.data().year || "",
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        name: form.name,
        ...(userData.role === "buddy" && {
          course: form.course,
          year: form.year,
        }),
      });

      setUserData((prev) => ({ ...prev, ...form }));
      setEditMode(false);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const avatarRef = ref(storage, `avatars/${auth.currentUser.uid}`);
    await uploadBytes(avatarRef, file);
    const url = await getDownloadURL(avatarRef);

    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      avatarUrl: url,
    });

    setUserData((prev) => ({ ...prev, avatarUrl: url }));
  };

  if (loading) {
    return (
      <Box sx={{ height: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!userData) return null;

  const { email, role, avatarUrl } = userData;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #063149 0%, #7aa5df 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 480,
          p: 4,
          borderRadius: 3,
          background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.25)",
          color: "#fff",
        }}
        
      >
        {/* Back Button */}
<Box sx={{ mb: 1 }}>
  <Button
    startIcon={<ArrowBackIcon />}
    onClick={() => navigate(-1)}
    sx={{
      color: "#fff",
      fontWeight: 700,
      textTransform: "none",
      borderRadius: 2,
      background: "rgba(255,255,255,0.08)",
      backdropFilter: "blur(10px)",
      "&:hover": {
        background: "rgba(255,255,255,0.16)",
      },
    }}
  >
    Back
  </Button>
</Box>

        {/* Avatar */}
        <Stack alignItems="center" spacing={1}>
          <label style={{ cursor: "pointer" }}>
            <input hidden type="file" accept="image/*" onChange={handleAvatarUpload} />
            <Avatar
              src={avatarUrl || ""}
              sx={{
                width: 80,
                height: 80,
                fontSize: 28,
                fontWeight: 800,
                bgcolor: "#9B8CFF",
              }}
            >
              {!avatarUrl && form.name?.[0]?.toUpperCase()}
            </Avatar>
          </label>

          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {form.name}
          </Typography>

          <Typography sx={{ opacity: 0.8 }}>
            {role === "superbird"
              ? "🦅 Super Bird"
              : role === "bird"
              ? "🐦 Bird"
              : "🐥 Buddy"}
          </Typography>
        </Stack>

        <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.2)" }} />

        {/* Fields */}
        <Stack spacing={2}>
          <ProfileField label="Email" value={email} />

          <EditableField
            label="Name"
            value={form.name}
            editable={editMode}
            onChange={(v) => setForm({ ...form, name: v })}
          />

          {role === "buddy" && (
            <>
              <EditableField
                label="Course"
                value={form.course}
                editable={editMode}
                onChange={(v) => setForm({ ...form, course: v })}
              />

              {editMode ? (
                <TextField
                  select
                  label="Year"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  sx={glassInput}
                >
                  <MenuItem value="1st Year">1st Year</MenuItem>
                  <MenuItem value="2nd Year">2nd Year</MenuItem>
                  <MenuItem value="3rd Year">3rd Year</MenuItem>
                </TextField>
              ) : (
                <ProfileField label="Year" value={form.year} />
              )}
            </>
          )}
        </Stack>

        <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.2)" }} />

        {/* Actions */}
        <Stack direction="row" spacing={2} justifyContent="center">
          {editMode ? (
            <>
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                Save
              </Button>
              <Button variant="outlined" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="contained" onClick={() => setEditMode(true)}>
              Edit Profile
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}

/* ---------- Helpers ---------- */

function ProfileField({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ opacity: 0.7 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 700 }}>{value || "-"}</Typography>
    </Box>
  );
}

function EditableField({ label, value, editable, onChange }) {
  return editable ? (
    <TextField
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={glassInput}
    />
  ) : (
    <ProfileField label={label} value={value} />
  );
}

const glassInput = {
  input: { color: "#fff" },
  label: { color: "rgba(255,255,255,0.7)" },
  "& .MuiOutlinedInput-root": {
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(12px)",
    "& fieldset": {
      borderColor: "rgba(255,255,255,0.3)",
    },
  },
};
