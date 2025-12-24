// src/App.js
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import BirdDashboard from "./pages/BirdDashboard";
import BuddyDashboard from "./pages/BuddyDashboard";
import ChatRoom from "./pages/ChatRoom";
import AdminDashboard from "./pages/AdminDashboard";
import CreatePair from "./pages/CreatePair";
import Profile from "./pages/Profile";

import { auth, db } from "./firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Listen for auth state + fetch role
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

  // ⏳ Global loading screen
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

  // 🔁 Helper redirect after login
  const redirectAfterLogin = () => {
  if (role === "superbird") return <Navigate to="/admin" replace />;
  if (role === "bird") return <Navigate to="/bird-dashboard" replace />;
  if (role === "buddy") return <Navigate to="/buddy-dashboard" replace />;
  return <Navigate to="/login" replace />;
};


  return (
    <Router>
      <Routes>

        {/* 🔐 LOGIN */}
        <Route
          path="/login"
          element={
            user ? redirectAfterLogin() : <Login />
          }
        />

        {/* ✨ SIGN UP */}
        <Route
          path="/signup"
          element={
            user ? redirectAfterLogin() : <Signup />
          }
        />

        {/* 🦅 SUPER BIRD ADMIN DASHBOARD */}
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

        {/* 🪶 BIRD / 🐥 BUDDY DASHBOARD */}
        

        {/* 💬 CHAT ROOM (ALL AUTH USERS) */}
        <Route
          path="/chat/:pairId"
          element={
            user ? <ChatRoom /> : <Navigate to="/login" replace />
          }
        />

        {/* ➕ CREATE PAIR (SUPER BIRD ONLY) */}
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

        {/* 🌐 FALLBACK */}
        <Route path="*" element={<Navigate to="/login" replace />} />
        <Route
  path="/profile"
  element={user ? <Profile /> : <Navigate to="/login" replace />}
/>
<Route
  path="/bird-dashboard"
  element={
    user && role === "bird" ? (
      <BirdDashboard />
    ) : (
      <Navigate to="/login" replace />
    )
  }
/>

<Route
  path="/buddy-dashboard"
  element={
    user && role === "buddy" ? (
      <BuddyDashboard />
    ) : (
      <Navigate to="/login" replace />
    )
  }
/>


      </Routes>
    </Router>
  );
}

export default App;
