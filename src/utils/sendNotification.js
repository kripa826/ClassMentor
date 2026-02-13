import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

export const sendNotification = async (
  toUserId,
  fromUserId,
  fromName,
  message,
  type
) => {
  if (!toUserId || !fromUserId || !fromName || !message || !type) {
    console.error("Missing notification data:", {
      toUserId,
      fromUserId,
      fromName,
      message,
      type,
    });
    return;
  }

  await addDoc(collection(db, "notifications"), {
    toUserId,
    fromUserId,
    fromName,
    message,
    type,
    read: false,
    createdAt: serverTimestamp(),
  });
};
