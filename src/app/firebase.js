// src/app/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// NAYA: Storage import kiya files ke liye, aur deleteDoc import kiya admin ke liye
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBJMxDZjy-EQedAVS25l1PwD76m-sjYSto",
  authDomain: "travelscotts-104dd.firebaseapp.com",
  projectId: "travelscotts-104dd",
  storageBucket: "travelscotts-104dd.firebasestorage.app",
  messagingSenderId: "937456149825",
  appId: "1:937456149825:web:b043327f3f821f1e4d2dc0",
  measurementId: "G-FK8CW3TBD5"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // NAYA: Cloud Storage initialized

// --- REVIEWS LOGIC ---
export const addReviewToDatabase = async (userName, rating, feedback) => {
  try {
    await addDoc(collection(db, "reviews"), { name: userName, rating: rating, comment: feedback, createdAt: serverTimestamp() });
    return true;
  } catch (error) { return false; }
};

export const getReviewsFromDatabase = async () => {
  try {
    const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const reviewsList = [];
    querySnapshot.forEach((doc) => { reviewsList.push({ id: doc.id, ...doc.data() }); });
    return reviewsList;
  } catch (error) { return []; }
};

// NAYA: ADMIN FUNCTION - Delete Review
export const deleteReviewFromDatabase = async (reviewId) => {
  try {
    await deleteDoc(doc(db, "reviews", reviewId));
    return true;
  } catch (error) { return false; }
};

// NAYA: VISA APPLICATIONS LOGIC
export const submitVisaApplication = async (userEmail, country, fileUrl) => {
  try {
    await addDoc(collection(db, "applications"), {
      email: userEmail,
      country: country,
      documentUrl: fileUrl,
      status: "Pending",
      appliedAt: serverTimestamp()
    });
    return true;
  } catch (error) { return false; }
};

export const getApplicationsFromDatabase = async () => {
  try {
    const q = query(collection(db, "applications"), orderBy("appliedAt", "desc"));
    const querySnapshot = await getDocs(q);
    const appList = [];
    querySnapshot.forEach((doc) => { appList.push({ id: doc.id, ...doc.data() }); });
    return appList;
  } catch (error) { return []; }
};

  

  
