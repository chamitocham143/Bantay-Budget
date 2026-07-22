import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./firebase.js";
import AuthScreen from "./components/AuthScreen.jsx";
import DashboardPlaceholder from "./components/DashboardPlaceholder.jsx";
import SplashScreen from "./components/SplashScreen.jsx";

const THEME_KEY = "bantayBudgetTheme";

function getInitialTheme() {
  return localStorage.getItem(THEME_KEY) || "dark";
}

function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser?.emailVerified) {
        setUser(null);
        setProfile(null);
        setAuthReady(true);
        return;
      }

      setUser(nextUser);

      try {
        const profileSnapshot = await getDoc(doc(db, "users", nextUser.uid));
        setProfile(profileSnapshot.exists() ? profileSnapshot.data() : null);
      } catch (error) {
        console.error("Unable to load user profile:", error);
        setProfile(null);
      } finally {
        setAuthReady(true);
      }
    });

    return unsubscribe;
  }, []);

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === "dark" ? "light" : "dark",
    );
  };

  if (!authReady) {
    return <SplashScreen />;
  }

  if (!user) {
    return <AuthScreen theme={theme} onToggleTheme={toggleTheme} />;
  }

  return (
  <DashboardPlaceholder
    user={user}
    profile={profile}
    theme={theme}
    onToggleTheme={toggleTheme}
    onSignOut={() => signOut(auth)}
  />
);
}

export default App;
