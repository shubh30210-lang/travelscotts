"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";
import { addReviewToDatabase, getReviewsFromDatabase, deleteReviewFromDatabase, submitVisaApplication, getApplicationsFromDatabase, storage } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "firebase/auth";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { auth } from "./firebase"; 

// ADMIN EMAIL (Ye client ka email hoga, abhi test ke liye ye rakhte hain)
const ADMIN_EMAIL = "admin@travelscotts.com";

const countryDatabase = [
  { id: "usa", name: "United States (USA)", searchKeys: ["usa", "us", "america", "united states"], lat: 37.0902, lng: -95.7129, type: "Sticker / Interview", features: ["DS-160 Confirmation Form", "Valid Passport (6 months minimum)", "3 Years ITR & Bank Statements", "In-person Biometric & Interview"] },
  { id: "canada", name: "Canada", searchKeys: ["canada", "toronto"], lat: 56.1304, lng: -106.3468, type: "Sticker / Digital Entry", features: ["IRCC Portal Digital Forms Submission", "Family Information Forms", "Proof of Assets (Property, Mutual Funds)", "Biometric Verification at VFS Desk"] },
  { id: "uk", name: "United Kingdom (UK)", searchKeys: ["uk", "london", "united kingdom", "britain"], lat: 55.3781, lng: -3.4360, type: "Sticker / VFS submission", features: ["Online Application & Fee Receipt", "Detailed 6-Month Bank Statements", "Employment Letter / Business Proof", "VFS Biometric Appointment"] },
  { id: "uae", name: "U.A.E. (Dubai)", searchKeys: ["uae", "dubai", "emirates"], lat: 23.4241, lng: 53.8478, type: "Instant e-Visa", features: ["Color Passport Copy (Front & Back)", "Passport Size Photo (White Background)", "Confirmed Return Flight Tickets", "Processing Time: 24 - 48 Hours"] },
  { id: "australia", name: "Australia", searchKeys: ["australia", "sydney", "melbourne"], lat: -25.2744, lng: 133.7751, type: "Online e-Visa", features: ["Subclass 600 Online Stream filing", "National Identity Documents (Aadhar/PAN)", "Payslips & Leave Approval Certificate", "No Passport submission required"] },
  { id: "singapore", name: "Singapore", searchKeys: ["singapore"], lat: 1.3521, lng: 103.8198, type: "Authorized e-Visa", features: ["Form 14A Completed & Signed", "SG Arrival Card (Submitted within 3 days)", "Confirmed Flight & Hotel Reservation", "Processing through Authorized Agent"] },
  { id: "europe", name: "Schengen (Europe)", searchKeys: ["europe", "schengen", "france", "germany", "italy"], lat: 54.5260, lng: 15.2551, type: "Sticker Visa", features: ["Schengen Travel Insurance (€30k coverage)", "Confirmed Flight Itinerary & Hotel Vouchers", "Day-by-day Detailed Cover Letter", "Personal Financial Sponsorship proof"] },
  { id: "thailand", name: "Thailand", searchKeys: ["thailand", "bangkok"], lat: 15.8700, lng: 100.9925, type: "Visa Free / Arrival", features: ["TDAC Mandatory Online Registration", "Confirmed Onward/Return Air Ticket", "Verified Hotel Accommodation Booking", "Proof of Funds (10,000 THB per person)"] },
  { id: "malaysia", name: "Malaysia", searchKeys: ["malaysia", "kuala lumpur"], lat: 4.2105, lng: 101.9758, type: "Visa Free Entry", features: ["30 Days Visa-Free Stay (Current Policy)", "Passport valid for 6+ months from entry", "Confirmed Round-trip Flights", "Digital Arrival Card (MDAC) Submission"] }
];

export default function Home() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  const [globeInput, setGlobeInput] = useState("");
  const [searchedVisa, setSearchedVisa] = useState(null);
  
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [liveReviews, setLiveReviews] = useState([]);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [isResetPassword, setIsResetPassword] = useState(false);

  // NAYA: Upload System States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedCountryForVisa, setSelectedCountryForVisa] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  // NAYA: Admin System States
  const [isAdminView, setIsAdminView] = useState(false);
  const [applications, setApplications] = useState([]);

  const globeContainerRef = useRef(null);
  const globeInstance = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    const data = await getReviewsFromDatabase();
    setLiveReviews(data);
  };

  const loadAdminData = async () => {
    const apps = await getApplicationsFromDatabase();
    setApplications(apps);
  };

  const initGlobe = () => {
    if (globeInstance.current || !globeContainerRef.current || !window.Globe || isAdminView) return;
    try {
      const world = window.Globe()(globeContainerRef.current)
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundColor('rgba(0,0,0,0)')
        .htmlElementsData([])
        .htmlElement(d => {
          const el = document.createElement('div');
          el.innerHTML = `📍 ${d.name.toUpperCase()}`;
          el.style.color = '#FFD700';
          el.style.fontWeight = 'bold';
          el.style.fontSize = '18px';
          el.style.textShadow = '2px 2px 4px #000';
          return el;
        });

      world.controls().autoRotate = true;
      world.controls().autoRotateSpeed = 1.0;
      globeInstance.current = world;
    } catch (error) {
      console.error("Globe init failed:", error);
    }
  };

  useEffect(() => {
    if(isAdminView) return;
    let checkInterval = setInterval(() => {
      if (window.Globe && globeContainerRef.current && !globeInstance.current) {
        globeContainerRef.current.innerHTML = '';
        initGlobe();
        clearInterval(checkInterval);
      }
    }, 500);
    return () => {
      clearInterval(checkInterval);
      if (globeInstance.current && globeContainerRef.current) {
        globeContainerRef.current.innerHTML = '';
        globeInstance.current = null;
      }
    };
  }, [isAdminView]);

  const handleGlobeSearch = () => {
    const input = globeInput.toLowerCase().trim();
    const foundCountry = countryDatabase.find(c => 
      c.id === input || c.searchKeys.some(key => key.includes(input))
    );
    if (foundCountry && globeInstance.current) {
      globeInstance.current.controls().autoRotate = false; 
      globeInstance.current.htmlElementsData([{ name: foundCountry.name, lat: foundCountry.lat, lng: foundCountry.lng }]);
      globeInstance.current.pointOfView({ lat: foundCountry.lat, lng: foundCountry.lng, altitude: 0.8 }, 2000);
      setSearchedVisa(foundCountry);
    } else { alert("Country not found! Try USA, Canada, UK, UAE, Australia, Thailand."); }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const email = e.target.userEmail.value;
    try {
      if (isResetPassword) {
        await sendPasswordResetEmail(auth, email);
        alert("Password reset link sent to your email!");
        setIsResetPassword(false);
      } else {
        const password = e.target.userPassword.value;
        if (authMode === 'register') {
          await createUserWithEmailAndPassword(auth, email, password);
          alert("Account Created! Now you can apply for Visa.");
        } else {
          await signInWithEmailAndPassword(auth, email, password);
          alert("Login Successful!");
        }
      }
      setIsLoginOpen(false);
      e.target.reset();
    } catch (error) { alert("Error: " + error.message); } 
    finally { setIsSubmitting(false); }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAdminView(false);
      alert("You have been logged out.");
    } catch (error) { console.error("Logout Error:", error); }
  };

  const handleConsultClick = (countryName) => {
    if (currentUser) {
      setSelectedCountryForVisa(countryName);
      setIsUploadOpen(true);
    } else {
      alert("Security Alert: Please Login or Register first to apply for a Visa.");
      setIsLoginOpen(true);
    }
  };

  // NAYA: Handle Document Upload
  const handleFileUploadSubmit = async (e) => {
    e.preventDefault();
    const file = e.target.document.files[0];
    if (!file) return;

    // Firebase Storage Reference
    const fileRef = ref(storage, `applications/${currentUser.uid}_${file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => { alert("Upload failed: " + error.message); }, 
      async () => {
        // Success
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const success = await submitVisaApplication(currentUser.email, selectedCountryForVisa, downloadURL);
        if(success) {
          alert(`Application submitted for ${selectedCountryForVisa}! We will review your documents.`);
          setIsUploadOpen(false);
          setUploadProgress(0);
        }
      }
    );
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const name = e.target.reviewerName?.value || "Anonymous";
    const rating = e.target.rating?.value || 5; 
    const comment = e.target.comment?.value || "";

    const success = await addReviewToDatabase(name, Number(rating), comment);
    if(success) {
        alert("Thank you! Review saved.");
        e.target.reset();
        setIsReviewOpen(false);
        fetchReviews();
    } else { alert("Failed to submit review."); }
    setIsSubmitting(false);
  };

  const deleteReview = async (id) => {
    if(confirm("Are you sure you want to delete this review?")) {
      await deleteReviewFromDatabase(id);
      fetchReviews();
    }
  };

  // 👑 ADMIN VIEW RENDER
  if (isAdminView) {
    return (
      <div style={{padding: "40px", background: "#f5f7fb", minHeight: "100vh"}}>
        <header style={{display: "flex", justifyContent: "space-between", marginBottom: "30px"}}>
          <h1 style={{color: "#002f6c"}}>Travelscotts Admin Dashboard 👑</h1>
          <button onClick={() => setIsAdminView(false)} style={{padding: "10px 20px", background: "#002f6c", color: "white", borderRadius: "5px", border: "none", cursor: "pointer"}}>Back to Website</button>
        </header>

        <h2 style={{color: "#333", borderBottom: "2px solid #ccc", paddingBottom: "10px"}}>Visa Applications</h2>
        <div style={{background: "white", padding: "20px", borderRadius: "10px", marginBottom: "40px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)"}}>
          <table style={{width: "100%", textAlign: "left", borderCollapse: "collapse"}}>
            <thead>
              <tr style={{borderBottom: "1px solid #ddd"}}>
                <th style={{padding: "10px"}}>Applicant Email</th>
                <th style={{padding: "10px"}}>Country</th>
                <th style={{padding: "10px"}}>Status</th>
                <th style={{padding: "10px"}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.length > 0 ? applications.map(app => (
                <tr key={app.id} style={{borderBottom: "1px solid #eee"}}>
                  <td style={{padding: "10px"}}>{app.email}</td>
                  <td style={{padding: "10px", fontWeight: "bold"}}>{app.country}</td>
                  <td style={{padding: "10px"}}><span style={{background: "#FFD700", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", color: "#000"}}>{app.status}</span></td>
                  <td style={{padding: "10px"}}>
                    <a href={app.documentUrl} target="_blank" rel="noreferrer" style={{color: "blue", textDecoration: "underline"}}>View Document</a>
                  </td>
                </tr>
              )) : <tr><td colSpan="4" style={{padding: "10px"}}>No applications yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <h2 style={{color: "#333", borderBottom: "2px solid #ccc", paddingBottom: "10px"}}>Manage Client Reviews</h2>
        <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginTop: "20px"}}>
          {liveReviews.map(rev => (
            <div key={rev.id} style={{background: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)"}}>
              <h4>{rev.name} ({"★".repeat(rev.rating)})</h4>
              <p style={{color: "#666", fontSize: "14px", marginTop: "10px"}}>"{rev.comment}"</p>
              <button onClick={() => deleteReview(rev.id)} style={{marginTop: "15px", background: "#ff4d4d", color: "white", padding: "5px 10px", border: "none", borderRadius: "4px", cursor: "pointer"}}>Delete Review</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 🌐 NORMAL WEBSITE RENDER
  return (
    <>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <Script src="https://unpkg.com/three" strategy="beforeInteractive" />
      <Script src="https://unpkg.com/globe.gl" strategy="beforeInteractive" />
      
      <a href="https://wa.me/919664955721" target="_blank" rel="noreferrer" className="float-wa"><i className="fa-brands fa-whatsapp"></i></a>

      <header>
        <div className="logo-area"><img src="/logo.jpeg" alt="Travelscotts Logo" /></div>
        <nav className="desktop-nav">
          <ul>
            <li><a href="#">Home</a></li>
            <li><a href="#services">Services</a></li>
            <li><a href="#globe-section">Visa Check</a></li>
            <li><a href="#reviews">Reviews</a></li>
            
            {/* ADMIN BUTTON (Only visible to Admin Email) */}
            {currentUser?.email === ADMIN_EMAIL && (
              <li><button className="login-btn" style={{background: "#25D366", color: "white"}} onClick={() => { loadAdminData(); setIsAdminView(true); }}>Admin Panel</button></li>
            )}
            
            <li>
              {currentUser ? (
                <button className="login-btn" style={{background: "#ff4d4d", color: "white"}} onClick={handleLogout}>Logout ({currentUser.email.split('@')[0]})</button>
              ) : (
                <button className="login-btn" onClick={() => { setIsLoginOpen(true); setIsResetPassword(false); }}>Login / Register</button>
              )}
            </li>
          </ul>
        </nav>
        <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}><i className={`fa-solid ${isMobileMenuOpen ? 'fa-xmark' : 'fa-bars'}`}></i></button>
      </header>

      {/* LOGIN MODAL */}
      <div id="loginModal" className="modal" style={{ display: isLoginOpen ? 'flex' : 'none' }}>
        <div className="modal-content">
          <span className="close-btn" onClick={() => setIsLoginOpen(false)}>&times;</span>
          {!isResetPassword && (
            <div className="modal-tabs">
              <button type="button" className={`tab-btn ${authMode === 'login' ? 'active' : ''}`} onClick={() => setAuthMode('login')}>Login</button>
              <button type="button" className={`tab-btn ${authMode === 'register' ? 'active' : ''}`} onClick={() => setAuthMode('register')}>Register</button>
            </div>
          )}
          <h2 style={{color:"#002f6c", marginBottom: "15px", marginTop:"10px"}}>
            {isResetPassword ? 'Reset Password' : (authMode === 'login' ? 'Secure Login' : 'Create Account')}
          </h2>
          <form onSubmit={handleLoginSubmit}>
            {!isResetPassword && authMode === 'register' && (<><input type="text" placeholder="Full Name" required /><input type="tel" placeholder="Phone Number" required /></>)}
            <input type="email" name="userEmail" placeholder="Email Address" required />
            {!isResetPassword && (<input type="password" name="userPassword" placeholder="Password" required />)}
            <button type="submit" disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? "Processing... ⏳" : (isResetPassword ? 'Send Reset Link' : (authMode === 'login' ? 'Login securely' : 'Register securely'))}
            </button>
          </form>
          {!isResetPassword ? ( authMode === 'login' && <p style={{marginTop: "15px", fontSize: "13px", color: "#002f6c", cursor: "pointer", fontWeight: "bold"}} onClick={() => setIsResetPassword(true)}>Forgot Password?</p> ) : ( <p style={{marginTop: "15px", fontSize: "13px", color: "#002f6c", cursor: "pointer", fontWeight: "bold"}} onClick={() => setIsResetPassword(false)}>Back to Login</p> )}
        </div>
      </div>

      {/* NAYA: DOCUMENT UPLOAD MODAL */}
      <div className="modal" style={{ display: isUploadOpen ? 'flex' : 'none' }}>
        <div className="modal-content">
          <span className="close-btn" onClick={() => setIsUploadOpen(false)}>&times;</span>
          <h2 style={{color:"#002f6c", marginBottom: "15px"}}>Apply for {selectedCountryForVisa}</h2>
          <p style={{fontSize: "14px", color: "#555", marginBottom: "20px"}}>Upload your Passport copy or required documents (PDF/JPG).</p>
          
          <form onSubmit={handleFileUploadSubmit}>
            <input type="file" name="document" accept=".pdf,.jpg,.jpeg,.png" required style={{border: "1px dashed #ccc", padding: "20px", width: "100%", marginBottom: "15px"}} />
            
            {uploadProgress > 0 && (
              <div style={{background: "#eee", width: "100%", height: "10px", borderRadius: "5px", marginBottom: "15px"}}>
                <div style={{background: "#25D366", width: `${uploadProgress}%`, height: "100%", borderRadius: "5px", transition: "width 0.3s"}}></div>
              </div>
            )}
            <button type="submit" style={{width: "100%", padding: "12px", background: "#002f6c", color: "white", border: "none", borderRadius: "5px", fontWeight: "bold", cursor: "pointer"}}>Upload & Submit Securely 🔒</button>
          </form>
        </div>
      </div>

      {/* REVIEW MODAL */}
      <div className="modal" style={{ display: isReviewOpen ? 'flex' : 'none' }}>
        <div className="modal-content">
          <span className="close-btn" onClick={() => setIsReviewOpen(false)}>&times;</span>
          <h2 style={{color:"#002f6c", marginBottom: "20px"}}>Write a Review</h2>
          <form onSubmit={handleReviewSubmit}>
            <input type="text" name="reviewerName" placeholder="Your Name" required />
            <select name="rating" required style={{width: "100%", padding: "12px", margin: "8px 0", border: "1px solid #ddd", borderRadius: "6px", background: "#f9f9f9"}}>
              <option value="5">★★★★★ (5 Stars)</option>
              <option value="4">★★★★☆ (4 Stars)</option>
              <option value="3">★★★☆☆ (3 Stars)</option>
              <option value="2">★★☆☆☆ (2 Stars)</option>
              <option value="1">★☆☆☆☆ (1 Star)</option>
            </select>
            <textarea name="comment" placeholder="Write your experience..." rows="4" required style={{width: "100%", padding: "12px", margin: "8px 0", border: "1px solid #ddd", borderRadius: "6px", background: "#f9f9f9", resize: "none"}}></textarea>
            <button type="submit" disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1 }}>{isSubmitting ? "Submitting..." : 'Submit Review'}</button>
          </form>
        </div>
      </div>

      <section className="hero">
        <div><h1>Visa Solutions For Your World</h1><p>Your Trusted Visa & Travel Partner</p><a href="#globe-section" className="btn">Explore Countries</a></div>
      </section>

      <section id="globe-section">
        <h2 className="section-title white-text" style={{marginBottom: "10px"}}>Search Your Destination</h2>
        <p style={{color: "white", marginBottom: "20px"}}>Enter a country to spin the globe & see visa requirements</p>
        <div className="search-box">
            <input type="text" placeholder="e.g. Canada, UK, Dubai" value={globeInput} onChange={(e)=>setGlobeInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleGlobeSearch()} />
            <button onClick={handleGlobeSearch}>Find & Pin</button>
        </div>
        <div ref={globeContainerRef} id="globeViz"></div>

        {searchedVisa && (
          <div className="visa-result-container">
            <div className="visa-result-header"><h3>{searchedVisa.name}</h3><span className="visa-badge">{searchedVisa.type}</span></div>
            <p style={{color: "#666", marginBottom: "15px", fontWeight: "bold"}}>Visa Requirements:</p>
            <ul className="visa-features">{searchedVisa.features.map((feature, i) => (<li key={i}>{feature}</li>))}</ul>
            <button className="book-btn" onClick={() => handleConsultClick(searchedVisa.name)}>Apply & Upload Documents</button>
          </div>
        )}
      </section>

      <section id="reviews" style={{background: "#eef2f9"}}>
        <div style={{display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", marginBottom: "40px"}}>
          <h2 className="section-title" style={{marginBottom: "10px"}}>Client Ratings</h2>
          <button onClick={() => setIsReviewOpen(true)} style={{background: "#002f6c", color: "white", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", border: "none"}}>Leave a Review ✍️</button>
        </div>
        <div className="reviews-grid">
            {liveReviews.length > 0 ? ( liveReviews.map((review) => (
                 <div className="review-card" key={review.id}><div className="stars">{"★".repeat(review.rating) + "☆".repeat(5 - review.rating)}</div><h3>{review.name}</h3><p>"{review.comment}"</p></div>
            ))) : (<><div className="review-card"><div className="stars">★★★★★</div><h3>Rahul Sharma</h3><p>"Got my Canada student visa in just 20 days! The process was incredibly smooth."</p></div></>)}
        </div>
      </section>
    
      <section className="contact" id="contact">
        <h2 className="section-title white-text">Contact Travelscotts</h2>
        <div className="contact-container">
          <a href="tel:9664955721" className="contact-link">
            <i className="fa-solid fa-phone" style={{color: "#002f6c"}}></i> 9664955721
          </a>
          <a href="tel:9112999933" className="contact-link">
            <i className="fa-solid fa-phone" style={{color: "#002f6c"}}></i> 9112999933
          </a>
          <a href="mailto:info@travelscotts.com" className="contact-link">
            <i className="fa-solid fa-envelope" style={{color: "#ea4335"}}></i> info@travelscotts.com
          </a>
          <a href="https://wa.me/919664955721" target="_blank" rel="noreferrer" className="contact-link wa-link">
            <i className="fa-brands fa-whatsapp"></i> Chat on WhatsApp
          </a>
        </div>
        <p style={{marginTop: "20px"}}>Turning Travel Dreams Into Reality!</p>
      </section>
    </>
  );
}