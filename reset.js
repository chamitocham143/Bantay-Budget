import { initializeApp }
from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';

import {
 getAuth,
 confirmPasswordReset
}
from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// REPLACE WITH YOUR FIREBASE CONFIG
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

const app =
 initializeApp(firebaseConfig);

const auth =
 getAuth(app);

const params =
 new URLSearchParams(
   window.location.search
 );

const oobCode =
 params.get('oobCode');

document.getElementById(
 'resetPasswordBtn'
).onclick = async ()=>{

 const password =
  document.getElementById(
   'newPassword'
  ).value;

 const confirm =
  document.getElementById(
   'confirmPassword'
  ).value;

 if(!password || !confirm){

   alert('All fields required');

   return;

 }

 if(password.length < 6){

   alert(
    'Password must be at least 6 characters'
   );

   return;

 }

 if(password !== confirm){

   alert('Passwords do not match');

   return;

 }

 try{

   await confirmPasswordReset(
     auth,
     oobCode,
     password
   );

   alert(
    'Password updated successfully'
   );

   window.location.href =
    'index.html';

 }
 catch(error){

   alert(
    'Reset link expired or invalid'
   );

 }

};

	//footer
			document.getElementById("year").textContent =
  new Date().getFullYear();