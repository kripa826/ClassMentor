import { db } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const logActivity = async (action, details, userId, userEmail) => {
    try {
        await addDoc(collection(db, "activityLogs"), {
            action,
            details,
            userId,
            userEmail,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error logging activity:", error);
    }
};
