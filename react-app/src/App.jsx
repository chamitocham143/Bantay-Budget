import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./firebase.js";
import AuthScreen from "./components/AuthScreen.jsx";
import DashboardPlaceholder from "./components/DashboardPlaceholder.jsx";
import SplashScreen from "./components/SplashScreen.jsx";
import { automaticSignOutHasExpired } from "./hooks/useInactivityLock.js";

const THEME_KEY = "bantayBudgetTheme";

function getInitialTheme() {
  return localStorage.getItem(THEME_KEY) || "dark";
}

const CURRENCY_KEY = "bantayBudgetCurrency";

function getInitialCurrency() {
  const savedCurrency =
    localStorage.getItem(CURRENCY_KEY);

  return savedCurrency === "PHP" ? "PHP" : "USD";
}

function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [currency, setCurrency] =
    useState(getInitialCurrency);

  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (nextUser) => {
        if (nextUser && automaticSignOutHasExpired()) {
          await signOut(auth);
          return;
        }

        if (!nextUser?.emailVerified) {
          setUser(null);
          setProfile(null);
          setAuthReady(true);
          return;
        }

        setUser(nextUser);

        try {
          const profileSnapshot = await getDoc(
            doc(db, "users", nextUser.uid)
          );

          const profileData = profileSnapshot.exists()
            ? profileSnapshot.data()
            : null;

          if (profileData && profileData.email !== nextUser.email) {
            const synchronizedProfile = {
              ...profileData,
              email: nextUser.email,
              emailUpdatedAt: Date.now(),
            };

            try {
              await setDoc(
                doc(db, "users", nextUser.uid),
                {
                  email: nextUser.email,
                  emailUpdatedAt: synchronizedProfile.emailUpdatedAt,
                },
                { merge: true },
              );
            } catch (synchronizationError) {
              console.error("Unable to synchronize the verified email:", synchronizationError);
            }

            setProfile(synchronizedProfile);
          } else {
            setProfile(profileData);
          }
        } catch (error) {
          console.error(
            "Unable to load user profile:",
            error
          );

          setProfile(null);
        } finally {
          setAuthReady(true);
        }
      }
    );

    return unsubscribe;
  }, []);

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === "dark" ? "light" : "dark"
    );
  };

  const changeCurrency = (nextCurrency) => {
    const supportedCurrency =
      nextCurrency === "PHP" ? "PHP" : "USD";

    localStorage.setItem(
      CURRENCY_KEY,
      supportedCurrency
    );

    setCurrency(supportedCurrency);
  };

  const handleSignOut = useCallback(() => signOut(auth), []);

  if (!authReady) {
    return <SplashScreen />;
  }

  if (!user) {
    return (
      <AuthScreen
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <DashboardPlaceholder
      user={user}
      profile={profile}
      theme={theme}
      currency={currency}
      onCurrencyChange={changeCurrency}
      onToggleTheme={toggleTheme}
      onSignOut={handleSignOut}
    />
  );
}

export default App;
