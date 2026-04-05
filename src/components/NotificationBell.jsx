import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // NEW
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Button,
  Snackbar,
  Box,
  Divider,
  Chip,
} from "@mui/material";

import NotificationsIcon from "@mui/icons-material/Notifications";
import MessageIcon from "@mui/icons-material/Message";
import GroupIcon from "@mui/icons-material/Group";
import ReportIcon from "@mui/icons-material/Report";

import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,  // NEW
  doc,
  writeBatch, // NEW
  orderBy,
} from "firebase/firestore";
import DeleteIcon from "@mui/icons-material/Delete"; // NEW
import ClearAllIcon from "@mui/icons-material/ClearAll"; // NEW

import { db } from "../firebaseConfig";

/* ---------- ICONS ---------- */

const getIcon = (type) => {
  switch (type) {
    case "MESSAGE":
    case "chat": // NEW
      return <MessageIcon fontSize="small" />;
    case "PAIR":
      return <GroupIcon fontSize="small" />;
    case "REPORT":
      return <ReportIcon fontSize="small" />;
    default:
      return <NotificationsIcon fontSize="small" />;
  }
};

/* ---------- COMPONENT ---------- */

const NotificationBell = ({ userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [latestMessage, setLatestMessage] = useState("");
  const navigate = useNavigate(); // NEW

  /* ---------- NAVIGATION LOGIC ---------- */

  const handleNotificationClick = async (n) => {
    // 1. Mark as read
    if (!n.read) {
      try {
        await markAsRead(n.id);
      } catch (err) {
        console.error("Error marking read:", err);
      }
    }
    // 2. Close menu
    handleClose();

    // 3. Navigate ONLY if it's a message
    if (n.type === "MESSAGE" || n.type === "chat") {
      const otherId = n.fromUserId || n.senderId || n.fromId;

      if (otherId && userId) {
        const chatId = [userId, otherId].sort().join("_");
        navigate(`/chat/${chatId}`);
      } else {
        console.warn("Cannot navigate to chat: Missing ID", { userId, otherId });
      }
    }
  };

  /* ---------- REALTIME LISTENER ---------- */

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "notifications"),
      where("toUserId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // ✅ Show popup for NEW notification
      setNotifications((prev) => {
        if (prev.length && newNotifications.length) {
          if (newNotifications[0].id !== prev[0].id) {
            setLatestMessage(newNotifications[0].message);
            setSnackbarOpen(true);
          }
        }
        return newNotifications;
      });
    });

    return () => unsubscribe();
  }, [userId]);

  /* ---------- COUNTER ---------- */

  const unreadCount = notifications.filter((n) => !n.read).length;

  /* ---------- MENU ---------- */

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  /* ---------- READ LOGIC ---------- */

  const markAsRead = async (id) => {
    await updateDoc(doc(db, "notifications", id), {
      read: true,
    });
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);

    for (let n of unread) {
      await updateDoc(doc(db, "notifications", n.id), {
        read: true,
      });
    }
  };

  /* ---------- DELETE LOGIC ---------- */

  const deleteNotification = async (id, e) => {
    e.stopPropagation(); // prevent menu close or item click
    await deleteDoc(doc(db, "notifications", id));
  };

  const clearAllNotifications = async () => {
    const batch = writeBatch(db);
    notifications.forEach((n) => {
      batch.delete(doc(db, "notifications", n.id));
    });
    await batch.commit();
  };

  /* ---------- UI ---------- */

  return (
    <>
      {/* ✅ Yellow Bell */}
      <IconButton onClick={handleOpen}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon sx={{ color: "#F4D58D" }} />
        </Badge>
      </IconButton>

      {/* ✅ Dropdown */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 360,
            background: "rgba(30, 41, 59, 0.85)", // Dark semi-transparent
            backdropFilter: "blur(16px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            color: "white",
            borderRadius: 4,
            mt: 1.5,
            padding: 0,
            overflow: "hidden", // clean edges
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="h6" fontWeight={800}>
            Notifications
          </Typography>

          {unreadCount > 0 && (
            <Button
              size="small"
              onClick={markAllAsRead}
              sx={{ mt: 0.5, mr: 1 }}
            >
              Mark All Read
            </Button>
          )}

          {notifications.length > 0 && (
            <Button
              size="small"
              color="error"
              startIcon={<ClearAllIcon />}
              onClick={clearAllNotifications}
              sx={{ mt: 0.5 }}
            >
              Clear All
            </Button>
          )}
        </Box>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

        {/* Empty State */}
        {notifications.length === 0 ? (
          <MenuItem>
            <Typography variant="body2" sx={{ opacity: 0.6 }}>
              No notifications yet ✨
            </Typography>
          </MenuItem>
        ) : (
          notifications.map((n) => (
            <MenuItem
              key={n.id}
              onClick={() => handleNotificationClick(n)} // UPDATED
              sx={{
                alignItems: "flex-start",
                gap: 1.5,
                py: 1.5,
                px: 2,
                transition: "all 0.2s ease",
                background: n.read ? "transparent" : "rgba(244,213,141,0.08)",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                "&:hover": {
                  background: "rgba(255,255,255,0.08)",
                  transform: "translateX(4px)",
                },
              }}
            >
              <Box>{getIcon(n.type)}</Box>

              <Box sx={{ flex: 1 }}>
                <Typography variant="body2">
                  <strong>{n.fromName}</strong>
                </Typography>

                <Typography variant="body2" sx={{ opacity: 0.75 }}>
                  {n.message}
                </Typography>

                {/* Date/Time Display */}
                <Typography variant="caption" sx={{ opacity: 0.5, fontSize: "0.7rem", display: "block", mt: 0.5 }}>
                  {n.createdAt?.seconds
                    ? new Date(n.createdAt.seconds * 1000).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "numeric", minute: "numeric"
                    })
                    : "Just now"}
                </Typography>

                {!n.read && (
                  <Chip
                    label="NEW"
                    size="small"
                    sx={{
                      mt: 0.6,
                      height: 18,
                      fontSize: 10,
                      bgcolor: "#F4D58D",
                      color: "black",
                      fontWeight: 800,
                    }}
                  />
                )}
              </Box>

              {/* Delete Button */}
              <IconButton
                size="small"
                onClick={(e) => deleteNotification(n.id, e)}
                sx={{
                  color: "rgba(255,255,255,0.3)",
                  "&:hover": { color: "#ff6e84" },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </MenuItem>
          ))
        )}
      </Menu>

      {/* ✅ Popup */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2500}
        onClose={() => setSnackbarOpen(false)}
        message={latestMessage}
      />
    </>
  );
};

export default NotificationBell;
