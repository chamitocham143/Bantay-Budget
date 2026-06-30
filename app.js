import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';

import {
  getMessaging,
  getToken,
  onMessage
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

import {
 initializeFirestore,
 collection,
 addDoc,
 onSnapshot,
 orderBy,
 deleteDoc,
 doc,
 updateDoc,
 setDoc,
 getDoc,
 getDocs,
 writeBatch,
 query,
 where
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import {
 getAuth,
 setPersistence,
 browserLocalPersistence,
 signInWithEmailAndPassword,
 createUserWithEmailAndPassword,
 sendEmailVerification,
 sendPasswordResetEmail,
 fetchSignInMethodsForEmail,
 onAuthStateChanged,
 signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
/*

// REPLACE WITH YOUR FIREBASE CONFIG

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDmB5Y3F8K5cDFzBt1nG8OXqlKF1Qa8fsY",
  authDomain: "bantaybudget101.firebaseapp.com",
  projectId: "bantaybudget101",
  storageBucket: "bantaybudget101.firebasestorage.app",
  messagingSenderId: "151522764289",
  appId: "1:151522764289:web:4834211cda5c01e5794200",
  measurementId: "G-WXNRL2RNYE"
};

*/

// THIS FIREBASE IS FOR THE PRODUCTION //
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDzB2BPPUZLfCNpIEM2JR7VeS8rPwSjzTs",
  authDomain: "expenses-monitoring-4540e.firebaseapp.com",
  projectId: "expenses-monitoring-4540e",
  storageBucket: "expenses-monitoring-4540e.firebasestorage.app",
  messagingSenderId: "1087776652368",
  appId: "1:1087776652368:web:6168ac2e6c88517d96a555",
  measurementId: "G-E52HTBDCJY"
};

let notificationsRef;
let notifications = [];
let unsubscribeNotifications = null;

const APP_VERSION = "Version 1.0.0";
const APP_BUILD = "Build 2026.06.30.01";

// Push Notifications //

async function enablePushNotifications() {
  
  console.log("Push button clicked");
  
  try {
    const user = auth.currentUser;

    if (!user) {
      alert("Please login first.");
      return;
    }

     const permission =
      await Notification.requestPermission();

    if (permission !== "granted") {
      alert("Notification permission was not allowed.");
      return;
    }

    if (!("Notification" in window)) {
  alert("Push notifications are not supported on this browser yet.");
  return;
}

if (!("serviceWorker" in navigator)) {
  alert("Service workers are not supported on this browser.");
  return;
}

    const registration =
      await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );

console.log("Notification supported:", "Notification" in window);
console.log("Service Worker supported:", "serviceWorker" in navigator);
console.log("Notification permission:", Notification.permission);
console.log("Current user:", auth.currentUser?.uid);

const token = await getToken(
  messaging,
  {
    vapidKey: "BLLmTyyWy1aHNMdOOlA3fIWdCCM_X4-AtHUL909gcNZ8cq7NpmOcRI-cGcG1quoQSpzA5bM4xnahn_1Eipngg7w",
    serviceWorkerRegistration: registration
  }
);

console.log("FCM Token:", token);

const deviceIdKey = "bantayBudgetDeviceId";

let deviceId = localStorage.getItem(deviceIdKey);

if (!deviceId) {
  deviceId = crypto.randomUUID();
  localStorage.setItem(deviceIdKey, deviceId);
}

await setDoc(
  doc(
    db,
    "users",
    auth.currentUser.uid,
    "devices",
    deviceId
  ),
  {
    token: token,
    updated: Date.now(),
    device: navigator.userAgent
  },
  { merge: true }
);

console.log("Token saved to Firestore");

localStorage.setItem("pushNotificationsEnabled", "true");
notificationToggle.checked = true;

 } catch (error) {
  console.error("Push notification error:", error);

  localStorage.setItem("pushNotificationsEnabled", "false");

  if (notificationToggle) {
    notificationToggle.checked = false;
  }

  alert(
    "Failed to enable push notifications:\n\n" +
    (error.code || "") +
    "\n" +
    (error.message || error)
  );
}

}

////////// EXPORT BACKUP ////////////


async function exportBackup() {
  const user = auth.currentUser;
  if (!user) {
    alert("Please login first.");
    return;
  }

  const collectionsToBackup = [
    "inflows",
    "expenses",
    "recurringExpenses"
  ];

  const backup = {
    app: "Bantay Budget",
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    uid: user.uid,
    data: {}
  };

  try {
    for (const collectionName of collectionsToBackup) {
      const snapshot = await getDocs(
        collection(db, "users", user.uid, collectionName)
      );

      backup.data[collectionName] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
    }

    const blob = new Blob(
      [JSON.stringify(backup, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const fileName =
      `bantay-budget-backup-${new Date().toISOString().slice(0, 10)}.json`;

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(url);

    alert("✅ Backup exported successfully.");
  } catch (error) {
    console.error("Backup export error:", error);
    alert("Failed to export backup.");
  }
}

////// RESTORE BACKUP DATA /////

async function restoreBackup(file) {
  const user = auth.currentUser;
  if (!user) {
    alert("Please login first.");
    return;
  }

  if (!file) return;

  const confirmed = confirm(
    "This will replace your current inflows, expenses, and recurring expenses with the backup file. Continue?"
  );

  if (!confirmed) return;

  try {
    const text = await file.text();
    const backup = JSON.parse(text);

    if (
      !backup ||
      backup.app !== "Bantay Budget" ||
      !backup.data
    ) {
      alert("Invalid backup file.");
      return;
    }

    const collectionsToRestore = [
      "inflows",
      "expenses",
      "recurringExpenses"
    ];

    for (const collectionName of collectionsToRestore) {
      const currentSnapshot = await getDocs(
        collection(db, "users", user.uid, collectionName)
      );

      for (const docSnap of currentSnapshot.docs) {
        await deleteDoc(
          doc(db, "users", user.uid, collectionName, docSnap.id)
        );
      }

      const items = backup.data[collectionName] || [];

      for (const item of items) {
        const { id, ...data } = item;

        await setDoc(
          doc(db, "users", user.uid, collectionName, id),
          data
        );
      }
    }

    alert("✅ Backup restored successfully.");
  } catch (error) {
    console.error("Backup restore error:", error);
    alert("Failed to restore backup.");
  }
}


/////#####################////////////

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);
const messaging = getMessaging(app);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});
const auth = getAuth(app);



//*************HELPER FUNCTIONS******************//

function formatCurrency(amount){

 return new Intl.NumberFormat(
   'en-US',
   {
     style:'currency',
     currency:'USD'
   }
 ).format(amount);

}

/// Notification timestamp //

function formatRelativeTime(timestamp){

  const seconds =
    Math.floor((Date.now() - timestamp) / 1000);

  if(seconds < 60)
    return "Just now";

  const minutes =
    Math.floor(seconds / 60);

  if(minutes < 60)
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;

  const hours =
    Math.floor(minutes / 60);

  if(hours < 24)
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;

  const days =
    Math.floor(hours / 24);

  if(days === 1)
    return "Yesterday";

  return `${days} days ago`;
}

////////// Start rebuilding here //////

/* =====================================
   STARTUP MANAGER
===================================== */

let appReady = false;
let splashVisible = true;
let appLocked = false;

let inflowsLoaded = false;
let expensesLoaded = false;
let recurringLoaded = false;

let inflowListener = null;
let expenseListener = null;
let recurringListener = null;

function resetStartupState(){

    inflowsLoaded = false;
    expensesLoaded = false;
    recurringLoaded = false;

    appReady = false;
    splashVisible = true;
    appLocked = false;

}

function cleanupListeners(){

    if(inflowListener){
        inflowListener();
        inflowListener = null;
    }

    if(expenseListener){
        expenseListener();
        expenseListener = null;
    }

    if(recurringListener){
        recurringListener();
        recurringListener = null;
    }

}

//App Lock //

function startupFinished(){

  console.log("startupFinished running");

  const enabled =
    localStorage.getItem("appLockEnabled") === "true";

  const user =
    auth.currentUser;

  console.log("App Lock enabled:", enabled);
  console.log("Current user:", user?.email);
  console.log("Verified:", user?.emailVerified);

  if(enabled && user && user.emailVerified){
  resetAppLockTimer();
}

if(user){

  notificationToggle.checked =
    localStorage.getItem(
      "pushNotificationsEnabled"
    ) === "true";

}

}

let appLockScrollY = 0;

function showAppLock(){
  console.log("showAppLock running");

  const lock =
    document.getElementById("appLockScreen");

  console.log("App lock element:", lock);

  if(!lock) return;

  appLockScrollY = window.scrollY;

  document.body.style.position = "fixed";
  document.body.style.top = `-${appLockScrollY}px`;
  document.body.style.width = "100%";
  document.body.style.overflow = "hidden";

  lock.classList.remove("hidden");
}

function hideAppLock(){
  const lock =
    document.getElementById("appLockScreen");

  if(!lock) return;

  lock.classList.add("hidden");

  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";
  document.body.style.overflow = "";

  window.scrollTo(0, appLockScrollY);
}


let appWasLockedByAway = false;

function lockAppWhenAway(){
  const enabled =
    localStorage.getItem("appLockEnabled") === "true";
  const user =
    auth.currentUser;
  if(!enabled || !user || !user.emailVerified){
    return;
  }
  if(isAnyOverlayOpen()){
    return;
  }
  showAppLock();
}

let appLockTimer = null;
const APP_LOCK_DELAY = 3 * 60 * 1000; // 3 minutes

function resetAppLockTimer(){
  clearTimeout(appLockTimer);

  const enabled =
    localStorage.getItem("appLockEnabled") === "true";

  const user =
    auth.currentUser;

  if(!enabled || !user || !user.emailVerified){
    return;
  }

  appLockTimer = setTimeout(() => {
    lockAppWhenAway();
  }, APP_LOCK_DELAY);
}

["click", "touchstart", "keydown", "mousemove", "scroll"].forEach(eventName => {
  document.addEventListener(eventName, resetAppLockTimer, { passive: true });
});

//SPLASH //

function showSplash(){

    const splash =
        document.getElementById("splashScreen");

    if(!splash) return;

    splash.style.display = "flex";
    splash.style.opacity = "1";

    splashVisible = true;

}

function hideSplash(){

    if(!splashVisible) return;

    splashVisible = false;

    const splash =
        document.getElementById("splashScreen");

    if(!splash) return;

    splash.style.opacity = "0";

    splash.style.transform = "scale(1.05)";
    setTimeout(()=>{
        splash.style.display="none";

        startupFinished();

    },500);

}

function checkAppReady(){

  console.log({
    inflowsLoaded,
    expensesLoaded,
    recurringLoaded
  });


    if(
        inflowsLoaded &&
        expensesLoaded &&
        recurringLoaded
    ){

        appReady = true;

        hideSplash();

    }

}



////////////////////////////////////////////////////////////
let inflowsRef;
let expensesRef;
let recurringRef;

const inflowsList = document.getElementById('inflowsList');
const expensesList = document.getElementById('expensesList');

let inflows = [];
let expenses = [];
let unverifiedUser = null;

let currentView = 'RECURRING';

const filterMonth =
  document.getElementById('filterMonth');

const today = new Date();

filterMonth.value =
  today.toISOString().slice(0,7);
  
filterMonth.addEventListener("change", render);

/*############################# 
RECURRING EXPENSES MANAGEMENT
//////########################/////*/
function showModal(id){
  document
    .getElementById(id)
    .classList.add('show');
}

function hideModal(id){
  document
    .getElementById(id)
    .classList.remove('show');
}
/////////////////////////////////

function loadRecurringExpenses(){

  const container =
    document.getElementById(
      'recurringExpensesList'
    );

  if(recurringListener){
    recurringListener();
  }

  recurringListener = onSnapshot(
    recurringRef,

    snapshot => {

      if(snapshot.empty){
        container.innerHTML = `
          <div class="empty-state">
            No recurring expenses found.
          </div>
        `;
          recurringLoaded = true;
          checkAppReady();
        return;
      }
      container.innerHTML = '';
      snapshot.forEach(docu => {
        
        const item = {
          id: docu.id,
          ...docu.data()
        };

        container.innerHTML += `

<div class="recurring-item">
  <div class="recurring-info">
    <strong>${item.desc}</strong>
    <div>
      Due date: ${item.recurringDay}
    </div>
    <div>
      Amount: ${formatCurrency(item.amount)}
    </div>
    <div class="status-badge">
      Status:
      <span class="status-icon">
        ${item.active ? '🟢' : '⏸'}
      </span>
      <span>
        ${item.active ? 'Active' : 'Paused'}
      </span>
    </div>
  </div>

  <div class="recurring-actions">
    <button
      onclick="editRecurring('${item.id}')"
    >
      <i class="fas fa-edit"></i>
    </button>

    <button
      onclick="toggleRecurring('${item.id}', ${item.active})"
    >
      ${
        item.active
          ? '<i class="fa-solid fa-pause"></i>'
          : '<i class="fa-solid fa-play"></i>'
      }
    </button>
    <button
      onclick="deleteRecurring('${item.id}')"
    >
      <i class="fa fa-trash"></i>
    </button>
  </div>
</div>

`;

      });
      
      recurringLoaded = true;
          checkAppReady();  

    },
    
    error => {
    console.error("Recurring listener error:", error);
    container.innerHTML =
    '<p>Error loading data.</p>';
    recurringLoaded = true;
    checkAppReady();
    }
  );

}

//####### DELETING RECURRING EXPENSES######//


window.deleteRecurring =
async(id)=>{

  const user =
    auth.currentUser;

  if(!user) return;

  const confirmed =
    confirm(
      "Delete recurring expense?"
    );

  if(!confirmed) return;

  await deleteDoc(
    doc(
      db,
      "users",
      user.uid,
      "recurringExpenses",
      id
    )
  );

};


/* LOGIN */

document.getElementById('loginBtn').onclick =
 async ()=>{
   const email =
    document.getElementById('email').value;
   const password =
    document.getElementById('password').value;
   if(!email || !password){
     alert('All fields required');
     return;
   }
   try{
     const userCredential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      
      
      
     await userCredential.user.reload();
     if(
 !userCredential.user.emailVerified
){
 unverifiedUser =
  userCredential.user;
 document.getElementById(
  'resendVerificationBtn'
 ).style.display='block';
 alert(
  'Please verify your email first.'
 );
 await signOut(auth);

 return;
    }
}
   catch(error){
     console.log(error);
     if(
       error.code ===
       'auth/invalid-credential'
     ){
       alert(
        'Invalid email or password'
       );
     }
     else{
       alert(error.message);
     }
   }
};

/* REGISTER */ 
/* Modal will pop up upon clicking */

document.getElementById(
 'registerBtn'
).onclick = ()=>{

 document
  .getElementById('registerModal')
  .classList.remove('hidden');

};

/*Submitting Registration */

document.getElementById(
 'submitRegisterBtn'
).onclick = async ()=>{

 const name =
  document.getElementById(
   'registerName'
  ).value;

 const email =
  document.getElementById(
   'registerEmail'
  ).value;

 const password =
  document.getElementById(
   'registerPassword'
  ).value;

 if(!name || !email || !password){
   alert('All fields required');
   return;
 }
 if(password.length < 6){
   alert(
    'Password must be at least 6 characters'
   );
   return;
 }
 try{
   const userCredential =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
   // SAVE USER PROFILE
   await setDoc(
     doc(
       db,
       'users',
       userCredential.user.uid
     ),
     {
       name:name,
       email:email,
       created:Date.now()
     }
   );

   // SEND EMAIL VERIFICATION
   await sendEmailVerification(
     userCredential.user
   );
   alert(
    'Account created. Verification email sent.'
   );
   closeModal('registerModal');
   await signOut(auth);
 }
 catch(error){
   console.log(error);
   if(
     error.code ===
     'auth/email-already-in-use'
   ){
     alert('Account already exists');
   }
   else{
     alert(error.message);
   }
 }
};

// Resend Email Verification 

document.getElementById(
 'resendVerificationBtn'
).onclick = async ()=>{

 if(!unverifiedUser){
   alert(
    'Please login first.'
   );
   return;
 }

 try{
   await sendEmailVerification(
     unverifiedUser
   );
   alert(
    'Verification email sent.'
   );
 }
 catch(error){
   console.error(error);
   alert(
    error.message
   );
 }
};

// Password Reset /////

document.getElementById(
 'forgotPassword'
).onclick = async ()=>{

 const email =
  document.getElementById('email').value;
 if(!email){
   alert('Enter your email first');
   return;
 }
 try{
   await sendPasswordResetEmail(
     auth,
     email
   );
   alert(
    'Password reset email sent'
   );
 }
 catch(error){
   if(error.code === 'auth/user-not-found'){
     alert('No account found');
   }
   else if(
     error.code === 'auth/invalid-email'
   ){
     alert('Invalid email address');
   }
   else{
     alert('Unable to send reset email');
   }
 }
};


onAuthStateChanged(auth, async (user) => {

    const loginPage = document.getElementById("authSection");
    const mainApp = document.getElementById("mainApp");
    const fabContainer = document.getElementById("fabContainer");

    // Hide everything first
    loginPage.style.display = "none";
    mainApp.style.display = "none";
    fabContainer.style.display = "none";

    // -------------------------
    // USER NOT LOGGED IN
    // -------------------------
    
    if (!user || !user.emailVerified) {

  cleanupListeners();
  resetStartupState();

  inflows = [];
  expenses = [];

  if(unsubscribeNotifications)
    unsubscribeNotifications();

notifications = [];

  loginPage.style.display = "block";
  mainApp.style.display = "none";
  fabContainer.style.display = "none";

  document
    .querySelectorAll(".modal")
    .forEach(modal => modal.classList.remove("show"));

  sidebar?.classList.remove("active");
  sidebarOverlay?.classList.remove("active");

  document.getElementById("sidebarUserName").textContent = "";
  document.getElementById("sidebarUserEmail").textContent = "";

  window.listenersInitialized = false;

  const splash =
    document.getElementById("splashScreen");

  if(splash){
    splash.style.display = "none";
  }

  return;
}
    
    // -------------------------
    // USER LOGGED IN
    // -------------------------

    showSplash();

    inflowsRef = collection(
        db,
        "users",
        user.uid,
        "inflows"
    );

    expensesRef = collection(
        db,
        "users",
        user.uid,
        "expenses"
    );

    recurringRef = collection(
        db,
        "users",
        user.uid,
        "recurringExpenses"
    );

    notificationsRef = collection(
  db,
  "users",
  user.uid,
  "notifications"
);

listenToNotifications();

    // -------------------------
    // USER PROFILE
    // -------------------------

    try {

        const snap = await getDoc(
            doc(db, "users", user.uid)
        );

        const userData = snap.data();

        document.getElementById(
            "sidebarUserName"
        ).textContent = userData.name;

        document.getElementById(
            "sidebarUserEmail"
        ).textContent = user.email;

        const hour = new Date().getHours();

        let greeting = "";

        if(hour < 5)
            greeting = "😴 Tulog Na";
        else if(hour < 12)
            greeting = "🌤️ Maayong Buntag";
        else if(hour < 13)
            greeting = "☀️ Maayong Udto";
        else if(hour < 18)
            greeting = "🌥️ Maayong Hapon";
        else if(hour < 22)
            greeting = "🌙 Maayong Gabi-i";
        else
            greeting = "✨ Good Night";

        document.getElementById(
            "welcomeUser"
        ).innerHTML =
            `${greeting}, ${userData.name} 👋`;

        document.getElementById(
            "profileBtn"
        ).textContent =
            userData.name.charAt(0).toUpperCase();

    } catch (err) {
        console.error(err);

    }

    // -------------------------
    // SHOW APP
    // -------------------------

    loginPage.style.display = "none";
    mainApp.style.display = "block";
    fabContainer.style.display = "flex";

    // -------------------------
    // START LISTENERS
    // -------------------------

    if (!window.listenersInitialized) {

  listenToInflows();
  listenToExpenses();
  loadRecurringExpenses();

  await generateRecurringExpenses();

  window.listenersInitialized = true;

}

});

// WHEN USER LEAVE APP LISTENER //

document.addEventListener("visibilitychange", () => {

  if(document.visibilityState === "hidden"){
    lockAppWhenAway();
  }

});
// PREVENT LOCK IF ANY MODAL OR PAGE IS OPEN //

function isAnyOverlayOpen(){

  return document.querySelector(".modal.show") ||
         document.querySelector(".settings-page.show") ||
         document.querySelector(".notifications-page.show") ||
         document.querySelector(".recurring-page.show");

}
	  
//selecting recurring day
 
const recurringDaySelect =
  document.getElementById(
    'recurringDay'
  );

for(let i = 1; i <= 31; i++){

  const option =
    document.createElement(
      'option'
    );

  option.value = i;
  option.textContent = i;

  recurringDaySelect.appendChild(
    option
  );

}
// show/hide logic for checkbox

function updateRecurringUI(){

  recurringDayContainer.style.display =
    isRecurring.checked
      ? 'block'
      : 'none';
}

const isRecurring =
  document.getElementById(
    'isRecurring'
  );

const recurringDayContainer =
  document.getElementById(
    'recurringDayContainer'
  );

   // Initial state

   updateRecurringUI();

isRecurring.addEventListener(
  'change',
  () => {

    updateRecurringUI();

  }
);


// adding inflows //

  document.getElementById('addInflowBtn').onclick = async ()=>{

  const btn =
  document.getElementById('addInflowBtn');

  btn.disabled = true;

  showSaving();

  try {

    // all your current save logic

  const date = document.getElementById('inflowDate').value;
  const desc = document.getElementById('inflowDesc').value;
  const amount = document.getElementById('inflowAmount').value;

 if(!date || !desc || !amount){
   alert('Paki fillout po yung fields');
   return;
 }

 await addDoc(inflowsRef,{
   type:'INFLOW',
   date,
   desc,
   amount:Number(amount),
   created:Date.now()
});
closeModal('inflowModal');
document.getElementById('inflowDesc').value='';
document.getElementById('inflowAmount').value='';

 document.getElementById('inflowDesc').value='';
 document.getElementById('inflowAmount').value='';

  } catch(err){

    console.error(err);
    alert('Error saving inflow.');

  } finally {

    hideSaving();
    btn.disabled = false;

  }

};

 
// ADDING EXPENSES//////

function showSaving(){
  document.getElementById('savingOverlay').style.display = 'flex';
}

function hideSaving(){
  document.getElementById('savingOverlay').style.display = 'none';
}
  
  document.getElementById('addExpenseBtn').onclick = async () => {
  
  const btn =
  document.getElementById('addExpenseBtn');

  btn.disabled = true;
  showSaving();

  try {

    // your existing save logic here
const isRecurring =
    document.getElementById('isRecurring').checked;

  const recurringDay =
    document.getElementById('recurringDay').value;

  const date =
    document.getElementById('expenseDate').value;

  const desc =
    document.getElementById('expenseDesc').value;

  const status =
    document.getElementById('expenseStatus').value;

  const amount =
    document.getElementById('expenseAmount').value;

  if (!desc || !status || !amount || (!isRecurring && !date)) {
    alert('Paki fillout yung fields');
    return;
  }

  // =========================
  // RECURRENT EXPENSE FLOW
  // =========================
  if (isRecurring) {

    if (!recurringDay) {
      alert('Please select recurring day');
      return;
    }

    await addDoc(recurringRef, {
      desc,
      amount: Number(amount),
      recurringDay: Number(recurringDay),
      active: true,
      created: Date.now()
    });
    
    await generateRecurringExpenses();

    alert('Recurring expense saved.');

  }

  // =========================
  // NORMAL EXPENSE FLOW
  // =========================
  else {

    await addDoc(expensesRef, {
      type: 'EXPENSE',
      date,
      desc,
      status,
      amount: Number(amount),
      created: Date.now()
    });

    // clear fields
    document.getElementById('expenseDate').value = '';
  }

  // =========================
  // COMMON CLEANUP
  // =========================
  document.getElementById('expenseDesc').value = '';
  document.getElementById('expenseAmount').value = '';
  document.getElementById('expenseStatus').value = '';
  document.getElementById('recurringDay').value = '';
  document.getElementById('isRecurring').checked = false;
  updateRecurringUI();

  closeModal('expenseModal');

  } catch(err){

    console.error(err);
    alert('Error saving expense.');

  } finally {
    
    hideSaving();
    btn.disabled = false;

  }

};


// GENERATING RECURRING EXPENSES

async function generateRecurringExpenses(){

 const user = auth.currentUser;

 if(!user) return;

 if(!recurringRef) return;

 const today = new Date();

 const year =
  today.getFullYear();

 const month =
  String(
   today.getMonth()+1
  ).padStart(2,'0');

 const recurringSnapshot =
  await getDocs(recurringRef);

 for(const recurringDoc of recurringSnapshot.docs){

   const recurring =
    recurringDoc.data();

   if(!recurring.active)
    continue;


   let day =
 Number(recurring.recurringDay);

const daysInMonth =
 new Date(
   year,
   Number(month),
   0
 ).getDate();

if(day > daysInMonth){
  day = daysInMonth;
}


const generatedDate =
 `${year}-${month}-${String(day).padStart(2,'0')}`;

  
  const existingQuery = query(
  expensesRef,
  where("recurringTemplateId", "==", recurringDoc.id),
  where("dueDate", "==", generatedDate)
);

const existing =
  await getDocs(existingQuery);

if(!existing.empty){

  console.log(
    "Skipped duplicate:",
    recurringDoc.id,
    generatedDate
  );

  continue;
}

console.log(
  "Creating recurring expense:",
  recurringDoc.id,
  generatedDate
);
  
  const todayDate =
  `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  
   await addDoc(expensesRef,{
  type:"EXPENSE",
  date: todayDate,
  dueDate: generatedDate,
  desc: recurring.desc,
  status:"ON HOLD",
  amount:Number(recurring.amount),
  recurring:true,
  recurringDay: day,
  recurringTemplateId: recurringDoc.id,
  created: Date.now()
});

 }

}

// EDIT RECURRING MODAL //

let editingRecurringId = null;

window.toggleRecurring = async function(id, active){

  console.log(
    "Current Firestore active value:",
    active
  );

  console.log(
    "New value to save:",
    !active
  );

  await updateDoc(
    doc(
      db,
      'users',
      auth.currentUser.uid,
      'recurringExpenses',
      id
    ),
    {
      active: !active
    }
  );

  console.log(
    "Recurring updated successfully"
  );

}

const editDay =
 document.getElementById(
   'editRecurringDay'
 );

for(let i=1;i<=31;i++){

  editDay.innerHTML += `
    <option value="${i}">
      ${i}
    </option>
  `;

}

window.editRecurring = async function(id){

  try{

    const snap = await getDoc(
      doc(
        db,
        'users',
        auth.currentUser.uid,
        'recurringExpenses',
        id
      )
    );

    const recurring = snap.data();

    editingRecurringId = id;

    document.getElementById(
      'editRecurringDesc'
    ).value = recurring.desc;

    document.getElementById(
      'editRecurringAmount'
    ).value = recurring.amount;

    document.getElementById(
      'editRecurringDay'
    ).value = recurring.recurringDay;

    document.getElementById(
  'editRecurringModal'
).classList.add('show');

  }catch(err){

    console.error(err);

    alert(
      'ERROR: ' + err.message
    );

  }

};


//SAVE RECURRING AFTER EDITING/UPDATING

document.getElementById(
  'saveRecurringEditBtn'
).onclick = async ()=>{

  const desc =
    document.getElementById(
      'editRecurringDesc'
    ).value;

  const amount =
    Number(
      document.getElementById(
        'editRecurringAmount'
      ).value
    );

  const recurringDay =
    Number(
      document.getElementById(
        'editRecurringDay'
      ).value
    );

  // UPDATE TEMPLATE

  await updateDoc(
    doc(
      db,
      'users',
      auth.currentUser.uid,
      'recurringExpenses',
      editingRecurringId
    ),
    {
      desc,
      amount,
      recurringDay
    }
  );

  // UPDATE GENERATED EXPENSE

  const expenseQuery =
    query(
      expensesRef,
      where(
        'recurringTemplateId',
        '==',
        editingRecurringId
      )
    );

  const snapshot =
    await getDocs(
      expenseQuery
    );

  const today =
    new Date();

  const newDate =
    `${today.getFullYear()}-${String(
      today.getMonth()+1
    ).padStart(2,'0')}-${String(
      recurringDay
    ).padStart(2,'0')}`;

  for(const expenseDoc of snapshot.docs){

    await updateDoc(
      doc(
        db,
        'users',
        auth.currentUser.uid,
        'expenses',
        expenseDoc.id
      ),
      {
        desc,
        amount,
        recurringDay,
        date:newDate
      }
    );

  }

  document
    .getElementById(
      'editRecurringModal'
    )
    .classList.remove('show');

};

////////////////LISTEN TO INFLOWS/////////////////////

function listenToInflows(){
  if(inflowListener){
    inflowListener();
  }
  inflowListener = onSnapshot(
    inflowsRef,
    snapshot => {
      inflows = [];
      snapshot.forEach(docu => {
        inflows.push({
          id: docu.id,
          ...docu.data()
        });
      });
      inflows.sort((a,b)=>b.created-a.created);
      render();
      inflowsLoaded = true;
      checkAppReady();
    },
    error => {
      console.error("Inflows listener error:", error);
      inflowsLoaded = true;
      checkAppReady();
    }
  );
}

/////// LISTEN TO EXPENSES /////

function listenToExpenses(){
  if(expenseListener){
    expenseListener();
  }
  expenseListener = onSnapshot(
    expensesRef,
    snapshot => {
      expenses = [];
      snapshot.forEach(docu => {
        expenses.push({
          id: docu.id,
          ...docu.data()
        });
      });
      expenses.sort((a,b)=>b.created-a.created);
      render();
      expensesLoaded = true;
      checkAppReady();
    },
    error => {
      console.error("Expenses listener error:", error);
      expensesLoaded = true;
      checkAppReady();
    }
  );
}

// FUNCTION FOR RECURRING NOTIFICATIONS SECTION //

function updateRecurringNotifications(){

  const list =
    document.getElementById("notificationList");

  const badge =
    document.getElementById("notificationBadge");

  if(!list || !badge) return;

  const unreadCount =
    notifications.filter(n => !n.read).length;

  badge.textContent = unreadCount;

  badge.style.display =
    unreadCount > 0
      ? "flex"
      : "none";

  if(notifications.length === 0){

    list.innerHTML = `
      <div class="empty-state">
        No upcoming recurring dues.
      </div>
    `;

    return;
  }

  list.innerHTML = "";

  notifications.forEach(item => {

    list.innerHTML += `
      <div class="notification-item ${item.read ? "read" : "unread"}">

        <div class="notification-icon">
          <i class="fa-solid fa-arrows-rotate"></i>
        </div>

        <div class="notification-body">
          <div class="notification-title">
            ${item.desc || item.title || "Reminder"}
          </div>

          <div class="notification-text">
            ${item.message || ""} • ${formatCurrency(item.amount || 0)}
          </div>

          <div class="notification-time">
          ${formatRelativeTime(item.created)}
          </div>

          ${!item.read ? `
            <button
              class="mark-read-btn"
              onclick="markNotificationRead('${item.id}')"
            >
              Mark read
            </button>
          ` : ""}
        </div>

      </div>
    `;

  });



async function markAllNotificationsRead(){

  if(!notificationsRef) return;

  const unread =
    notifications.filter(n => !n.read);

  if(unread.length === 0) return;

  const batch = writeBatch(db);

  unread.forEach(item => {
    batch.update(
      doc(notificationsRef, item.id),
      { read:true }
    );
  });

  await batch.commit();
}

async function clearOldNotifications(){

  if(!notificationsRef) return;

  const confirmClear = confirm(
  "Delete read notifications older than 7 days?");
  
  if(!confirmClear) return;

  const DAYS_TO_KEEP = 7;

const retentionPeriod =
  DAYS_TO_KEEP * 24 * 60 * 60 * 1000;

  const now = Date.now();

  const oldRead =
    notifications.filter(item =>
      item.read &&
      item.created &&
      now - item.created > retentionPeriod
    );

  if(oldRead.length === 0){
    alert("No old read notifications to clear.");
    return;
  }

  const batch = writeBatch(db);

  oldRead.forEach(item => {
    batch.delete(
      doc(notificationsRef, item.id)
    );
  });

  await batch.commit();
}

const markAllReadBtn =
  document.getElementById("markAllReadBtn");

const clearOldNotificationsBtn =
  document.getElementById("clearOldNotificationsBtn");

if(markAllReadBtn){
  markAllReadBtn.onclick = markAllNotificationsRead;
  markAllReadBtn.disabled =
    !notifications.some(n => !n.read);
}

if(clearOldNotificationsBtn){
  clearOldNotificationsBtn.onclick = clearOldNotifications;
  clearOldNotificationsBtn.disabled =
    !notifications.some(n =>
      n.read &&
      n.created &&
      Date.now() - n.created >
        7 * 24 * 60 * 60 * 1000
    );
}
}

// LISTEN TO NOTIFS //

function listenToNotifications(){

    if(!notificationsRef) return;

    if(unsubscribeNotifications)
        unsubscribeNotifications();

    const q = query(
        notificationsRef,
        orderBy("created","desc")
    );

    unsubscribeNotifications =
    onSnapshot(q,snapshot=>{

        notifications =
        snapshot.docs.map(doc=>({

            id:doc.id,
            ...doc.data()

        }));

        updateRecurringNotifications();

    });

}

//SEND TEST PUSH //

window.sendTestPush = async function () {

  try {

    const sendPush =
      httpsCallable(functions, "sendTestPush");

    const result = await sendPush();

    console.log(result.data);

    alert("✅ Test push notification sent!");

  } catch (error) {

    console.error(error);
    alert(error.message);

  }

};



// RENDER FUCNTIONS// 
function render(){
 const filter = document.getElementById('filterMonth').value;

inflowsList.innerHTML='';
expensesList.innerHTML='';


const filteredInflows =
 inflows.filter(i=>
  !filter ||
  (
    (i.date && i.date.startsWith(filter)) ||
    (i.month && i.month===filter)
  )
);

const filteredExpenses = expenses.filter(e =>
  !filter || e.date.startsWith(filter)
);

let displayExpenses = filteredExpenses;

if(currentView === 'EXPENSES'){
  
  displayExpenses =
  filteredExpenses
    .filter(e => !e.recurring)
    .sort((a,b) =>
      new Date(b.date) - new Date(a.date)
    );
}

if(currentView === 'RECURRING'){
  displayExpenses =
    filteredExpenses
      .filter(e => e.recurring)
      .sort((a,b) =>
        Number(b.recurringDay || 0) -
        Number(a.recurringDay || 0)
      );
}

const inflowsSection =
 document.getElementById('inflowsSection');

const expensesSection =
 document.getElementById('expensesSection');

const expensesTitle =
  document.getElementById("expensesTitle");

if(currentView === 'INFLOWS'){

  inflowsSection.style.display = 'block';
  expensesSection.style.display = 'none';

}
else if(currentView === 'EXPENSES'){

  inflowsSection.style.display = 'none';
  expensesSection.style.display = 'block';
  expensesTitle.textContent = 'Non-recurring Expenses';

}
else if(currentView === 'RECURRING'){

  inflowsSection.style.display = 'none';
  expensesSection.style.display = 'block';
  expensesTitle.textContent = 'Recurring Expenses';

}
else{

  inflowsSection.style.display = 'block';
  expensesSection.style.display = 'block';
  expensesTitle.textContent = 'All Expenses';

}
 

  let inflowTotal=0;
  let paidTotal = 0;
  let pendingTotal = 0;
  let onHoldTotal = 0;

 // ###### GENERATING INFLOWS ########//

   filteredInflows.forEach(item => {

  inflowTotal += item.amount;

  inflowsList.innerHTML += `
  
    <div class="money-card inflow-card">

      <div class="money-card-main">

        <div class="money-icon">
          💰
        </div>

        <div class="money-info">
          <h3>${item.desc}</h3>
          <p>
        📅 ${new Date(item.date).toLocaleDateString(
        "en-US",
         {
          month: "short",
          day: "numeric",
          year: "numeric"
          }
        )}
          </p>
        </div>

        <div class="money-amount">
          <h2>+${formatCurrency(item.amount)}</h2>

          <span class="status-pill income-pill">
            Income
          </span>
        </div>

      </div>

      <div class="money-card-bottom">

        <span></span>

        <div class="money-actions">

          <button
            onclick="editInflow(
              '${item.id}',
              '${item.desc}',
              '${item.date}',
              '${item.amount}'
            )"
          >
            <i class="fas fa-edit"></i>
          </button>

          <button
            onclick="deleteInflow('${item.id}')"
          >
            <i class="fa-regular fa-trash-can"></i>
          </button>

        </div>

      </div>

    </div>

  `;

});


 // ########## GENERATING EXPENSES #######/////

const months = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec'
];

/* =========================
   SUMMARY CALCULATION ONLY
========================= */

filteredExpenses.forEach(item=>{

  if(item.status === 'PAID'){
    paidTotal += item.amount;
  }

  if(item.status === 'PENDING'){
    pendingTotal += item.amount;
  }

  if(item.status === 'ON HOLD'){
    onHoldTotal += item.amount;
  }

});


/* =========================
   DISPLAY EXPENSES ONLY
========================= */

displayExpenses.forEach(item => {

  const statusClass =
    item.status === "PAID"
      ? "paid"
      : item.status === "PENDING"
      ? "pending"
      : "hold";

  const statusIcon =
    item.status === "PAID"
      ? "✅"
      : item.status === "PENDING"
      ? "⏳"
      : "⏸️";

  const statusSelectClass =
    item.status === "PAID"
      ? "status-paid"
      : item.status === "PENDING"
      ? "status-pending"
      : "status-hold";

  let recurringBadgeDate = "";

  if (item.recurring) {
    const badgeDate = item.dueDate || item.date;
    const parts = badgeDate.split("-");
    recurringBadgeDate = `${months[Number(parts[1]) - 1]} ${Number(parts[2])}`;
  }

  expensesList.innerHTML += `

    <div class="money-card expense-card ${statusClass}">
      <div class="money-card-main">
        <div class="money-icon">${statusIcon}</div>

        <div class="money-info">
          <h3>${item.desc}</h3>
          <p>
          📅 ${new Date(item.date).toLocaleDateString(
          "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric"
          }
            )}
          </p>
        </div>

        <div class="money-amount">
          <h2>-${formatCurrency(item.amount)}</h2>

          <select
            onchange="updateExpenseStatus('${item.id}', this.value)"
            class="money-status-select ${statusSelectClass}"
          >
            <option value="ON HOLD" ${item.status === "ON HOLD" ? "selected" : ""}>ON HOLD</option>
            <option value="PENDING" ${item.status === "PENDING" ? "selected" : ""}>PENDING</option>
            <option value="PAID" ${item.status === "PAID" ? "selected" : ""}>PAID</option>
          </select>
        </div>
      </div>

      <div class="money-card-bottom">
        ${
          item.recurring
            ? `<span class="recurring-badge">
                 <span class="recurring-icon">🔁</span>
                  ${recurringBadgeDate}
               </span>`
            : `<span></span>`
        }

        <div class="money-actions">
          ${
            item.recurring
              ? `
                <button onclick="alert('Edit this item from Recurring Expenses Management.')">
                  <span class="action-icon">
  <i class="fa-solid fa-lock"></i>
</span>
                </button>
              `
              : `
                <button onclick="editExpense(
                  '${item.id}',
                  '${item.desc}',
                  '${item.date}',
                  '${item.amount}'
                )">
                
                  <span class="action-icon">
    <i class="fas fa-edit"></i>
</span>
                </button>
              `
          }

          <button onclick="deleteExpense('${item.id}')">
            
            <span class="action-icon">
  <i class="fa-regular fa-trash-can"></i>
</span>
          </button>
        </div>
      </div>
    </div>
  `;
});


//CALCULATE //

const allocable = inflowTotal - paidTotal;
const available = allocable - pendingTotal;

document.getElementById("totalInflows").textContent =
    formatCurrency(inflowTotal);

document.getElementById("totalPaid").textContent =
    formatCurrency(paidTotal);

document.getElementById("totalPending").textContent =
    formatCurrency(pendingTotal);

document.getElementById("totalOnHold").textContent =
    formatCurrency(onHoldTotal);

document.getElementById("allocableBalance").textContent =
    formatCurrency(allocable);

document.getElementById("availableBalance").textContent =
    formatCurrency(available);

updateBudgetInsight({
  inflowTotal,
  paidTotal,
  pendingTotal,
  onHoldTotal,
  allocable,
  available
});

if(displayExpenses.length === 0){
  expensesList.innerHTML = `
    <div class="empty-state">
      Wala pong makitang records.
    </div>
  `;
  
}


if(filteredInflows.length===0){

 inflowsList.innerHTML = `
   <div class="empty-state">
    Wala pong makitang records.
   </div>
 `;

}
//UPDATE RECURRING NOTIFICATIONS //

updateRecurringNotifications();

// --------Fianacial Tips------- //

updateFinanceTip();
}

window.deleteInflow = async(id)=>{

 const user = auth.currentUser;

 if(!user) return;

 if(confirm('Opps! Sure ka idelete ito?')){

   await deleteDoc(
     doc(db,'users',user.uid,'inflows',id)
   );

 }

}

window.deleteExpense = async(id)=>{

 const user = auth.currentUser;

 if(!user) return;

 if(confirm('Opps! Sure ka idelete ito?')){

   await deleteDoc(
     doc(db,'users',user.uid,'expenses',id)
   );

 }

}

window.editInflow = async(
 id,
 currentDesc,
 currentDate,
 currentAmount
)=>{

 const user = auth.currentUser;

 if(!user) return;

 const desc =
 prompt('Edit Description', currentDesc);

 if(desc === null) return;

 const date =
 prompt('Edit Date (YYYY-MM-DD)', currentDate);

 if(date === null) return;

 const amount =
 prompt('Edit Amount', currentAmount);

 if(amount === null) return;

 await updateDoc(
   doc(db,'users',user.uid,'inflows',id),
   {
     desc,
     date,
     amount:Number(amount)
   }
 );

};

window.editExpense = async(
 id,
 currentDesc,
 currentDate,
 currentAmount
)=>{
  
  const expenseDoc =
  await getDoc(
    doc(
      db,
      'users',
      auth.currentUser.uid,
      'expenses',
      id
    )
  );

if(expenseDoc.data()?.recurring){

  alert(
    'Recurring expenses must be edited from Recurring Expenses Management.'
  );

  return;
}

 const user = auth.currentUser;

 if(!user) return;

 const desc =
 prompt('Edit Description', currentDesc);

 if(desc === null) return;

 const date =
 prompt('Edit Date (YYYY-MM-DD)', currentDate);

 if(date === null) return;

 const amount =
 prompt('Edit Amount', currentAmount);

 if(amount === null) return;

 await updateDoc(
   doc(db,'users',user.uid,'expenses',id),
   {
     desc,
     date,
     amount:Number(amount)
   }
 );

};


window.updateExpenseStatus = async(id,status)=>{

 const user = auth.currentUser;

if(!user) return;

await updateDoc(
 doc(db,'users',user.uid,'expenses',id),
 {
   status:status
 }
);

};

document.getElementById('filterMonth').addEventListener('change',render);

document.getElementById('showInflowsBtn').onclick = ()=>{
 currentView = 'INFLOWS';
 render();

};

document.getElementById('showExpensesBtn').onclick = ()=>{
 currentView = 'EXPENSES';
 render();

};

document.getElementById('showRecurringBtn').onclick = ()=>{
  currentView = 'RECURRING';
  render();

}; 


////////////////
function setActiveSegment(id) {
  document
    .querySelectorAll(".segment-btn")
    .forEach(btn => btn.classList.remove("active"));

  document
    .getElementById(id)
    ?.classList.add("active");
}

showInflowsBtn.addEventListener("click", () => {
  setActiveSegment("showInflowsBtn");
});

showExpensesBtn.addEventListener("click", () => {
  setActiveSegment("showExpensesBtn");
});

showRecurringBtn.addEventListener("click", () => {
  setActiveSegment("showRecurringBtn");
});

  // EXPORT BACKUP CONECT TO UI////

  const backupDataBtn =
  document.getElementById("backupDataBtn");

const restoreDataInput =
  document.getElementById("restoreDataInput");

backupDataBtn?.addEventListener("click", exportBackup);

restoreDataInput?.addEventListener("change", e => {

  const file = e.target.files[0];
  if(!file) return;
  const confirmRestore = confirm(
    "Restore this backup?\n\nThis will merge or replace your current data."
  );
  if(!confirmRestore){
    e.target.value = "";
    return;
  }
  restoreBackup(file);
  e.target.value = "";
});


//About Page //

const aboutAppBtn = document.getElementById("aboutAppBtn");
const aboutPage = document.getElementById("aboutPage");
const closeAboutPage = document.getElementById("closeAboutPage");

if(aboutAppBtn && aboutPage){
  aboutAppBtn.onclick = () => {
    aboutPage.classList.add("show");
  };
}

if(closeAboutPage && aboutPage){
  closeAboutPage.onclick = () => {
    aboutPage.classList.remove("show");
  };
}


  // CREATE MERK READ FOR THE NOTIFICATIONS //

  window.markNotificationRead =
async function(id){

    await updateDoc(

        doc(notificationsRef,id),

        {
            read:true
        }

    );

}

//Dynamic Budget Insight Helper Function//

function updateBudgetInsight({
  inflowTotal,
  paidTotal,
  pendingTotal,
  onHoldTotal,
  allocable,
  available
}){

  const card = document.getElementById("budgetInsight");
  const title = document.getElementById("insightTitle");
  const text = document.getElementById("insightText");

  if(!card || !title || !text) return;

  card.className = "budget-insight-card";

  if(inflowTotal === 0){
    title.textContent = "No inflows yet";
    text.textContent = "Add your income first so Bantay Budget can calculate your available balance.";
    card.classList.add("neutral");
    return;
  }

  if(pendingTotal > available){
    title.textContent = "Budget Watch";
    text.textContent =
      `Your pending payments total ${formatCurrency(pendingTotal)}, which is higher than your available balance of ${formatCurrency(available)}.`;
    card.classList.add("warning");
    return;
  }

  if(pendingTotal > 0){
    title.textContent = "Upcoming Payments";
    text.textContent =
      `You have ${formatCurrency(pendingTotal)} in pending payments. Your available balance is ${formatCurrency(available)}.`;
    card.classList.add("info");
    return;
  }

  if(onHoldTotal > 0){
    title.textContent = "On Hold Items";
    text.textContent =
      `${formatCurrency(onHoldTotal)} is currently on hold and not deducted from your available balance.`;
    card.classList.add("neutral");
    return;
  }

  title.textContent = "Great job!";
  text.textContent =
    `All tracked payments are settled. Your available balance is ${formatCurrency(available)}.`;
  card.classList.add("success");
}
  
// DYNAMIC TIPS FUNCTION //

const financeTips = [

  { icon:"💰", text:"Pay yourself first. Save before spending." },

  { icon:"📈", text:"Track every expense, even the smallest ones." },

  { icon:"💳", text:"Avoid carrying credit card balances whenever possible." },

  { icon:"🏦", text:"Build an emergency fund covering 3–6 months of expenses." },

  { icon:"📅", text:"Pay bills before their due date to avoid penalties." },

  { icon:"🛒", text:"Create a shopping list to reduce impulse purchases." },

  { icon:"🚗", text:"Review recurring subscriptions every few months." },

  { icon:"📊", text:"Review your budget at least once every month." },

  { icon:"🌱", text:"Small savings made consistently grow over time." },

  { icon:"🎯", text:"Set realistic financial goals and celebrate your progress." },

  { icon:"💵", text:"Spend less than you earn every month." },

  { icon:"📚", text:"Invest in learning—financial knowledge pays lifelong dividends." }

];

function updateFinanceTip(){

    const tipIcon =
        document.getElementById("tipIcon");

    const tipText =
        document.getElementById("tipText");

    if(!tipIcon || !tipText) return;

    const today =
        new Date().toDateString();

    const savedDate =
        localStorage.getItem("financeTipDate");

    let index =
        Number(localStorage.getItem("financeTipIndex"));

    if(savedDate !== today || isNaN(index)){

        index =
            Math.floor(
                Math.random() *
                financeTips.length
            );

        localStorage.setItem(
            "financeTipDate",
            today
        );

        localStorage.setItem(
            "financeTipIndex",
            index
        );

    }

    tipIcon.textContent =
        financeTips[index].icon;

    tipText.textContent =
        financeTips[index].text;

}



// Exporting CSV File //


document.getElementById('exportData').onclick = ()=>{
 const filter =
  document.getElementById(
   'filterMonth'
  ).value;
 const filteredInflows =
  inflows.filter(i=>
   !filter ||
   (
    i.date &&
    i.date.startsWith(filter)
   )
  );
 
const filteredExpenses = expenses.filter(e =>
  !filter || e.date.startsWith(filter)
);

//csv exporting

 let csv =
  'Type,Date,Description,Status,Amount\n';
 filteredInflows.forEach(i=>{
   csv +=
    `Inflow,${i.date},"${i.desc}",N/A,${i.amount}\n`;
 });
 filteredExpenses.forEach(e=>{
   csv +=
    `Expense,${e.date},"${e.desc}",${e.status},${e.amount}\n`;
 });

//Condition if no records on selected month// 
if(
 filteredInflows.length === 0 &&
 filteredExpenses.length === 0
){
 alert(
  'Wala pong records sa napiling buwan.'
 );
 return;
}

 const blob =
  new Blob(
   [csv],
   {type:'text/csv'}
  );
 const a =
  document.createElement('a');
 a.href =
  URL.createObjectURL(blob);
 const exportMonth =
  filter ||
  new Date()
   .toISOString()
   .slice(0,7);
 a.download =
  `Budget Summary for ${exportMonth}.csv`;
 a.click();

};

// Spinner

const pullLoader = document.getElementById("pullLoader");
const appContainer = document.getElementById("mainApp");

let startY = 0;
let isPulling = false;

if (appContainer) {

  appContainer.addEventListener("touchstart", (e) => {
    if (window.scrollY === 0) {
      startY = e.touches[0].clientY;
    }
  });

  appContainer.addEventListener("touchmove", (e) => {
    const currentY = e.touches[0].clientY;

    if (window.scrollY === 0 && currentY - startY > 80) {
      isPulling = true;
      pullLoader.classList.add("active");
      appContainer.classList.add("pulling");
    }
  });

  appContainer.addEventListener("touchend", () => {
    if (isPulling) {
      setTimeout(() => {
        pullLoader.classList.remove("active");
        appContainer.classList.remove("pulling");
        isPulling = false;
      }, 1500);
    }
  });

}


	//footer main page //
			document.getElementById("year").textContent =
  new Date().getFullYear();

  //Footer About Page //

  const copyrightYear = document.getElementById("copyrightYear");

if(copyrightYear){
  copyrightYear.textContent = new Date().getFullYear();
}
 
// MODAL

const inflowModal =
 document.getElementById('inflowModal');

const expenseModal =
 document.getElementById('expenseModal');

// OPEN INFLOW MODAL

document.getElementById(
 'openInflowModal'
).onclick = ()=>{

 document
  .getElementById('inflowModal')
  .classList.add('show');

};

// OPEN EXPENSE MODAL

document.getElementById(
 'openExpenseModal'
).onclick = ()=>{

 document
  .getElementById('expenseModal')
  .classList.add('show');

};

// OPEN REGISTER MODAL

document.getElementById(
 'registerBtn'
).onclick = ()=>{

 document
  .getElementById('registerModal')
  .classList.add('show');

};

window.closeModal = (id)=>{

 document
  .getElementById(id)
  .classList.remove('show');

};

// SIDE NAVIGATION //

function openSidebar() {
  sidebar.classList.add("active");
  sidebarOverlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeSidebar() {
  sidebar.classList.remove("active");
  sidebarOverlay.classList.remove("active");
  document.body.style.overflow = "";
}

const profileBtn =
 document.getElementById("profileBtn");

const sidebar =
 document.getElementById("sidebar");

const sidebarOverlay =
 document.getElementById("sidebarOverlay");

const closeSidebarBtn =
 document.getElementById("closeSidebarBtn");

if(profileBtn){
 profileBtn.addEventListener(
  "click",
  openSidebar
 );
}

if(closeSidebarBtn){
 closeSidebarBtn.addEventListener(
  "click",
  closeSidebar
 );
}

if(sidebarOverlay){
 sidebarOverlay.addEventListener(
  "click",
  closeSidebar
 );
}


profileBtn?.addEventListener("click", openSidebar);

closeSidebarBtn?.addEventListener("click", closeSidebar);

sidebarOverlay?.addEventListener("click", closeSidebar);


/* THEME */

function updateThemeButton(){

 const btn =
  document.getElementById(
   "sidebarDarkModeBtn"
  );

 if(!btn) return;

 btn.innerHTML =
  document.body.classList.contains("dark")
   ? 
   '<i class="fa-regular fa-sun"></i> Light Mode'
   : 
  '<i class="fa-regular fa-moon"></i> Dark Mode';

}

const savedTheme =
 localStorage.getItem('theme');

// Default = DARK
if(savedTheme === 'light'){

 document.body.classList.remove('dark');

}else{

 document.body.classList.add('dark');

}

updateThemeButton();

document
.getElementById("sidebarDarkModeBtn")
?.addEventListener("click", () => {

  document.body.classList.toggle("dark");

  if(
    document.body.classList.contains("dark")
  ){
    localStorage.setItem(
      "theme",
      "dark"
    );

  }else{

    localStorage.setItem(
      "theme",
      "light"
    );

  }
  updateThemeButton();

});

document
  .getElementById("sidebarLogoutBtn")
  ?.addEventListener("click", () => {

    sidebarLogoutBtn.click();

});

const darkSwitch =
document.getElementById("settingDarkMode");

darkSwitch.checked =
document.body.classList.contains("dark");

darkSwitch.addEventListener("change",()=>{

    document.body.classList.toggle(
        "dark",
        darkSwitch.checked
    );

    localStorage.setItem(
        "theme",
        darkSwitch.checked ? "dark":"light"
    );

    updateThemeButton();

});

//SECURITY WITH APP LOCK //

const biometricSwitch =
  document.getElementById("settingBiometric");

biometricSwitch.checked =
  localStorage.getItem("appLockEnabled") === "true";

biometricSwitch.addEventListener("change", () => {

  localStorage.setItem(
    "appLockEnabled",
    biometricSwitch.checked ? "true" : "false"
  );

  console.log(
    "App Lock setting:",
    localStorage.getItem("appLockEnabled")
  );

});

// REMINDERS NOTIFICATION SETTINGS //

const reminderSwitch =
document.getElementById("notificationToggle");

reminderSwitch.checked =
localStorage.getItem("reminder") === "true";

reminderSwitch.addEventListener("change",()=>{

    localStorage.setItem(
        "reminder",
        reminderSwitch.checked
    );

});

// Enable Push Notification //

const notificationToggle =
  document.getElementById("notificationToggle");
  

notificationToggle.addEventListener("change", async () => {
  if (notificationToggle.checked) {
    await enablePushNotifications();
  } else {
    localStorage.setItem("pushNotificationsEnabled", "false");
    alert("Push notifications turned off.");
  }
});

recurringExpensesBtn.onclick = () => {
    closeSidebar();
    setTimeout(() => {
        document
            .getElementById("recurringPage")
            .classList.add("show");
            document.body.style.overflow = "hidden";
    }, 100);

};

closeRecurringPage.onclick = () => {
    document
        .getElementById("recurringPage")
        .classList.remove("show");
        document.body.style.overflow = "";

};

/* LOGOUT */
document.getElementById("sidebarLogoutBtn")
?.addEventListener("click", async ()=>{

 await signOut(auth);

 closeSidebar();

 document.getElementById('email').value='';
 document.getElementById('password').value='';
 fabContainer.style.display = "none";

});

// PASSWORD TOOGLE REVEAL / HIDE //

const passwordInput =
  document.getElementById("password");

const togglePassword =
  document.getElementById("togglePassword");

togglePassword.addEventListener(
  "click",
  () => {
    const isPassword =
      passwordInput.type === "password";
    passwordInput.type =
      isPassword
        ? "text"
        : "password";
    togglePassword.classList.toggle(
      "fa-eye"
    );
    togglePassword.classList.toggle(
      "fa-eye-slash"
    );
  }
);

//PASSWORD HIDE/REVEAL FOR REGISTRATION //

const registerPassword =
  document.getElementById(
    "registerPassword"
  );

const toggleRegisterPassword =
  document.getElementById(
    "toggleRegisterPassword"
  );

toggleRegisterPassword?.addEventListener(
  "click",
  () => {
    const hidden =
      registerPassword.type === "password";
    registerPassword.type =
      hidden
        ? "text"
        : "password";
    toggleRegisterPassword.classList.toggle(
      "fa-eye"
    );
    toggleRegisterPassword.classList.toggle(
      "fa-eye-slash"
    );

  }
);

// INSTALL PROMPT ///


let deferredPrompt;

window.addEventListener(
  'beforeinstallprompt',
  (e)=>{

    e.preventDefault();

    deferredPrompt = e;

    document
      .getElementById('installBtn')
      .style.display = 'block';

});


document
.getElementById("installBtn")
.addEventListener("click", async ()=>{

  if(!deferredPrompt)
    return;

  deferredPrompt.prompt();

  await deferredPrompt.userChoice;

  deferredPrompt = null;

  document.getElementById(
    "installBtn"
  ).style.display="none";

});

if(
 window.matchMedia(
 '(display-mode: standalone)'
 ).matches
){
 document.getElementById(
   "installBtn"
 ).style.display = "none";
}

window.addEventListener(
  "appinstalled",
  ()=>{

    alert(
      "🎉 Bantay Budget app installed successfully!"
    );

});


// SETTINGS PAGE //

settingsBtn.onclick = () => {
    closeSidebar();
    setTimeout(() => {
        document
            .getElementById("settingsPage")
            .classList.add("show");
            document.body.style.overflow = "hidden";
    }, 100);
};

backSettings.onclick = () => {
    document
        .getElementById("settingsPage")
        .classList.remove("show");
        document.body.style.overflow = "";

}

console.log("Splash hidden");
console.log(localStorage.getItem("appLockEnabled"));
console.log(document.getElementById("appLockModal"));

// AppLock Button //

document
  .getElementById("unlockBtn")
  ?.addEventListener("click", () => {

    console.log("Unlock clicked");

    hideAppLock();

  });


// OPEN / CLOSE NOTIFICATION PAGE //

document
  .getElementById("notificationBtn")
  ?.addEventListener("click", () => {

    document
      .getElementById("notificationsPage")
      .classList.add("show");

    document.body.style.overflow = "hidden";

  });

document
  .getElementById("closeNotificationsPage")
  ?.addEventListener("click", () => {

    document
      .getElementById("notificationsPage")
      .classList.remove("show");

    document.body.style.overflow = "";

  });
  
  
// WRAPPING DEBUGGING LOGS FOR CONSOLE //
//TO STAY CLEAN FOR FUTURE DEBUGGING ///

const DEBUG = false;

if(DEBUG){
  console.log("startupFinished running");
  console.log("App Lock enabled:", enabled);
  console.log("Current user:", user?.email);
  console.log("Verified:", user?.emailVerified);
  console.log("Skipped duplicate:");
}

//PREVENT SCREEN BEHIND MODAL SCROLLABLE //

function showLockScreen() {
  lockScreen.style.display = "flex";

  document.body.style.position = "fixed";
  document.body.style.top = `-${window.scrollY}px`;
  document.body.style.width = "100%";
}

function hideLockScreen() {
  const scrollY = document.body.style.top;

  lockScreen.style.display = "none";

  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";

  window.scrollTo(
    0,
    parseInt(scrollY || "0") * -1
  );
}


//Hide developer tools button//

window.addEventListener("load", () => {

  let developerPressTimer = null;

  const versionLabel =
    document.getElementById("appVersion");

  const testPushBtn =
    document.getElementById("testPushBtn");

  if (!versionLabel || !testPushBtn) return;

  function toggleDeveloperMode() {

    testPushBtn.classList.toggle("hidden-dev");

    const enabled =
      !testPushBtn.classList.contains("hidden-dev");

    alert(
      enabled
        ? "🛠 Developer Mode Enabled"
        : "🛠 Developer Mode Disabled"
    );

  }

  versionLabel.addEventListener("touchstart", () => {
    developerPressTimer =
      setTimeout(toggleDeveloperMode, 2000);
  });

  versionLabel.addEventListener("touchend", () => {
    clearTimeout(developerPressTimer);
  });

  versionLabel.addEventListener("touchcancel", () => {
    clearTimeout(developerPressTimer);
  });

  versionLabel.addEventListener("mousedown", () => {
    developerPressTimer =
      setTimeout(toggleDeveloperMode, 2000);
  });

  versionLabel.addEventListener("mouseup", () => {
    clearTimeout(developerPressTimer);
  });

  versionLabel.addEventListener("mouseleave", () => {
    clearTimeout(developerPressTimer);
  });

});

// Version/Build Number //

document.getElementById("appVersion").textContent = APP_VERSION;
document.getElementById("appBuild").textContent = APP_BUILD;

// ENDDD//
