// src/App.js
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Dashboard from "./pages/Dashboard";
import ChatRoom from "./pages/ChatRoom";
import AdminDashboard from "./pages/AdminDashboard";
import CreatePair from "./pages/CreatePair";
import { auth, db } from "./firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Listen for auth + fetch role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data().role);
          } else {
            setRole(null);
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Simple loading screen
  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          background: "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* 🟢 Login */}
        <Route
          path="/login"
          element={
            user ? (
              role === "superbird" ? (
                <Navigate to="/admin" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            ) : (
              <Login />
            )
          }
        />

        {/* 🦅 Super Bird Dashboard */}
        <Route
          path="/admin"
          element={
            user && role === "superbird" ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* 🪶 Bird / 🐥 Buddy Dashboard */}
        <Route
          path="/dashboard"
          element={
            user && role !== "superbird" ? (
              <Dashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* 💬 Chat Room */}
        <Route
          path="/chat/:pairId"
          element={
            user ? (
              <ChatRoom />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* ➕ Create Pair (only for Super Bird) */}
        <Route
          path="/createpair"
          element={
            user && role === "superbird" ? (
              <CreatePair />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Default route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
