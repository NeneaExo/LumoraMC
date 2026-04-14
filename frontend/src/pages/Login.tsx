import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, User, Lock, Sparkles, Crown, ArrowLeft, AlertCircle, Sun, Moon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import netherBanner from "@/assets/netheris-banner.png";
import netherLogo from "@/assets/netheris-logo.png";
import { api, setToken } from "../api";
import "./styles/Login.css";
import { useTheme } from "../context/ThemeContext";

type Mode = "login" | "register";

const Login = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const { theme, toggleTheme } = useTheme();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "register") {
      if (form.password !== form.confirmPassword) { setError("Parolele nu coincid."); return; }
      if (form.password.length < 6) { setError("Parola trebuie să aibă minim 6 caractere."); return; }
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await api.auth.login(form.username.trim(), form.password);
        setToken(res.token);
        localStorage.setItem("netheris_user", JSON.stringify(res.user));
        navigate("/dashboard");
      } else {
        const res = await fetch("http://localhost:3001/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: form.username.trim(), email: form.email.trim(), password: form.password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Eroare la înregistrare.");
        setToken(data.token);
        localStorage.setItem("netheris_user", JSON.stringify(data.user));
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "A apărut o eroare.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-bg">
        <img src={netherBanner} alt="" className="login-bg-image" />
        <div className="login-bg-overlay" />
        <div className="login-bg-glow-left" />
        <div className="login-bg-glow-right" />
      </div>

      <Link to="/" className="login-back">
        <ArrowLeft size={14} />
        <span>Înapoi</span>
      </Link>
      <button className="login-theme-toggle" onClick={toggleTheme} title={theme === "dark" ? "Temă luminoasă" : "Temă întunecată"}>
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className="login-wrapper">
        <motion.div className="login-card" initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
          <div className="login-logo">
            <div className="login-logo-glow" />
            <img src={netherLogo} alt="Netheris" className="login-logo-img" />
          </div>

          <div className="login-header">
            <h1 className="login-title">{mode === "login" ? "Bine ai revenit" : "Alătură-te"}</h1>
            <p className="login-subtitle">{mode === "login" ? "Intră în contul tău Netheris" : "Creează-ți contul Netheris"}</p>
          </div>

          <div className="login-tabs">
            <button className={`login-tab ${mode === "login" ? "active" : ""}`} onClick={() => { setMode("login"); setError(""); }}>Login</button>
            <button className={`login-tab ${mode === "register" ? "active" : ""}`} onClick={() => { setMode("register"); setError(""); }}>Register</button>
            <div className="login-tab-indicator" style={{ transform: mode === "login" ? "translateX(0)" : "translateX(100%)" }} />
          </div>

          <motion.button className="login-discord" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <svg className="login-discord-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <span>Continuă cu Discord</span>
          </motion.button>

          <div className="login-divider">
            <span className="login-divider-line" />
            <span className="login-divider-text">sau</span>
            <span className="login-divider-line" />
          </div>

          <AnimatePresence mode="wait">
            <motion.form key={mode} onSubmit={handleSubmit} className="login-form"
              initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
              transition={{ duration: 0.25 }}
            >
              {mode === "register" && (
                <div className="login-field">
                  <label className="login-label">Email</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon">✉️</span>
                    <input type="email" name="email" placeholder="email@exemplu.com" value={form.email} onChange={handleChange} className="login-input" required disabled={loading} />
                  </div>
                </div>
              )}

              <div className="login-field">
                <label className="login-label">Username</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon"><User size={15} /></span>
                  <input type="text" name="username" placeholder="username-ul tău" value={form.username} onChange={handleChange} className="login-input" required disabled={loading} />
                </div>
              </div>

              <div className="login-field">
                <label className="login-label">Parolă</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon"><Lock size={15} /></span>
                  <input type={showPassword ? "text" : "password"} name="password" placeholder="••••••••" value={form.password} onChange={handleChange} className="login-input" required disabled={loading} />
                  <button type="button" className="login-eye" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {mode === "register" && (
                <div className="login-field">
                  <label className="login-label">Confirmă Parola</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon"><Lock size={15} /></span>
                    <input type={showConfirm ? "text" : "password"} name="confirmPassword" placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} className="login-input" required disabled={loading} />
                    <button type="button" className="login-eye" onClick={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <motion.div className="login-error-msg" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
                  <AlertCircle size={13} />
                  {error}
                </motion.div>
              )}

              {mode === "login" && (
                <div className="login-forgot">
                  <a href="#" className="login-forgot-link">Ai uitat parola?</a>
                </div>
              )}

              <motion.button type="submit" className="login-submit" whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.97 }} disabled={loading}>
                {loading ? <span className="login-spinner" /> : <><Crown size={15} /><span>{mode === "login" ? "Intră în cont" : "Creează cont"}</span></>}
              </motion.button>
            </motion.form>
          </AnimatePresence>

          <div className="login-footer">
            <div className="login-footer-divider">
              <span className="login-footer-line" />
              <Sparkles className="login-footer-icon" size={10} />
              <span className="login-footer-line" />
            </div>
            <p className="login-footer-text">© 2026 NETHERIS • ALL RIGHTS RESERVED</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
