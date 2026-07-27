import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase.js";

const initialRegistration = { name: "", email: "", password: "" };

function friendlyError(error) {
  const messages = {
    "auth/email-already-in-use": "An account already exists for this email.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/weak-password": "Password must be at least 6 characters.",
  };

  return messages[error.code] || "Something went wrong. Please try again.";
}

function AuthScreen({ theme, onToggleTheme }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registration, setRegistration] = useState(initialRegistration);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const updateRegistration = (event) => {
    setRegistration((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (!email || !password) {
      setMessage({ type: "error", text: "Email and password are required." });
      return;
    }

    setBusy(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await credential.user.reload();

      if (!credential.user.emailVerified) {
        setUnverifiedUser(credential.user);
        setMessage({
          type: "warning",
          text: "Please verify your email before signing in.",
        });
        await signOut(auth);
      }
    } catch (error) {
      setMessage({ type: "error", text: friendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleRegistration = async (event) => {
    event.preventDefault();
    setMessage(null);

    const { name, email: registerEmail, password: registerPassword } = registration;

    if (!name.trim() || !registerEmail || !registerPassword) {
      setMessage({ type: "error", text: "All registration fields are required." });
      return;
    }

    if (registerPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    setBusy(true);

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        registerEmail,
        registerPassword,
      );

      await setDoc(doc(db, "users", credential.user.uid), {
        name: name.trim(),
        email: registerEmail,
        created: Date.now(),
      });
      await sendEmailVerification(credential.user);
      await signOut(auth);

      setRegistration(initialRegistration);
      setMode("login");
      setEmail(registerEmail);
      setMessage({
        type: "success",
        text: "Account created. Check your email to verify your account.",
      });
    } catch (error) {
      setMessage({ type: "error", text: friendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    setMessage(null);

    if (!email) {
      setMessage({ type: "error", text: "Enter your email first." });
      return;
    }

    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage({ type: "success", text: "Password reset email sent." });
    } catch (error) {
      setMessage({ type: "error", text: friendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedUser) return;

    setBusy(true);
    try {
      await sendEmailVerification(unverifiedUser);
      setMessage({ type: "success", text: "Verification email sent again." });
    } catch (error) {
      setMessage({ type: "error", text: friendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-screen">
      <button className="theme-button" type="button" onClick={onToggleTheme}>
        {theme === "dark" ? "☀️" : "🌙"}
      </button> 

      <section className="auth-card" aria-labelledby="auth-title">
        <div className="brand-mark" aria-hidden="true">
          <img src="/icons/icon-192.png" alt="" />
        </div>
        <p className="eyebrow">Personal finance made simple</p>
        <h2 id="auth-title">Bantay Budget</h2>
        <p className="auth-subtitle">
          {mode === "login" ? "Sign in to get started" : "Create your account"}
        </p>

        {message && (
          <div className={`form-message ${message.type}`} role="status">
            {message.text}
          </div>
        )}

        {mode === "login" ? (
          <form onSubmit={handleLogin}>
            <label>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </label>
            <label>
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword((shown) => !shown)}>
                  {showPassword ? "hide" : "Show"}
                </button>
              </div>
            </label>
            <button className="text-button forgot-button" type="button" onClick={handlePasswordReset}>
              Forgot password?
            </button>
            <button className="primary-button" disabled={busy} type="submit">
              {busy ? "Please wait…" : "Sign in"}
            </button>
            {unverifiedUser && (
              <button className="secondary-button" disabled={busy} type="button" onClick={handleResendVerification}>
                Resend verification email
              </button>
            )}
            <p className="switch-copy">No account yet?</p>
            <button className="secondary-button" type="button" onClick={() => { setMode("register"); setMessage(null); }}>
              Create account
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegistration}>
            <label>
              <input name="name" value={registration.name} onChange={updateRegistration} placeholder="First Name" autoComplete="name" />
            </label>
            <label>
              <input name="email" type="email" value={registration.email} placeholder="Email" onChange={updateRegistration} autoComplete="email" />
            </label>
            <label>
              <div className="password-field">
                <input name="password" type={showRegisterPassword ? "text" : "password"} value={registration.password} placeholder="Password" onChange={updateRegistration} autoComplete="new-password" />
                <button type="button" onClick={() => setShowRegisterPassword((shown) => !shown)}>{showRegisterPassword ? "Hide" : "Show"}</button>
              </div>
            </label>
            <button className="primary-button" disabled={busy} type="submit">
              {busy ? "Creating account…" : "Create account"}
            </button>
            <button className="text-button" type="button" onClick={() => { setMode("login"); setMessage(null); }}>
              Back to sign in
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default AuthScreen;
