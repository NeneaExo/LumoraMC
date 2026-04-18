import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  Users,
  Wifi,
  Globe,
  ExternalLink,
  Activity,
  Zap,
  Diamond,
  Crown,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import { Link } from "react-router-dom";
import netherLogo from "@/assets/netheris-logo.png";
import netherBanner from "@/assets/netheris-banner.png";
import "./styles/Index.css";
import { useTheme } from "../context/ThemeContext";

const SERVER_IP = "play.netheris.ro";

type Particle = {
  id: number;
  left: string;
  animationDelay: string;
  animationDuration: string;
};

const Index = () => {
  const [copied, setCopied] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [particles, setParticles] = useState<Particle[]>([]);
  const playerCount = 1247;

  useEffect(() => {
    const newParticles = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 15}s`,
      animationDuration: `${15 + Math.random() * 15}s`,
    }));
    setParticles(newParticles);
  }, []);

  const copyIP = () => {
    navigator.clipboard.writeText(SERVER_IP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = [
    { icon: Activity, value: "99.9%", label: "UPTIME" },
    { icon: Zap, value: "12ms", label: "RESPONSE" },
    { icon: Users, value: playerCount.toLocaleString(), label: "PLAYERS" },
    { icon: Diamond, value: "I", label: "SEASON" },
  ];

  const links = [
    {
      id: "discord",
      label: "Discord",
      href: "https://discord.gg/netheris",
      className: "discord",
      external: true,
    },
    {
      id: "store",
      label: "Store",
      href: "https://store.netheris.ro/",
      className: "store",
      external: false,
    },
    {
      id: "panel",
      label: "Panel",
      href: "/login",
      className: "panel",
      external: false,
    },
  ];

  return (
    <div className="luxury-container">
      <div className="luxury-bg">
        <img src={netherBanner} alt="" className="luxury-bg-image" />
        <div className="luxury-bg-overlay-1" />
        <div className="luxury-bg-overlay-2" />
        <div className="luxury-bg-overlay-3" />
        <div className="luxury-bg-pattern" />
        <div className="luxury-particles">
          {particles.map((p) => (
            <div
              key={p.id}
              className="luxury-particle"
              style={{
                left: p.left,
                animationDelay: p.animationDelay,
                animationDuration: p.animationDuration,
              }}
            />
          ))}
        </div>
      </div>

      <button
        className="luxury-theme-toggle"
        onClick={toggleTheme}
        title={theme === "dark" ? "Temă luminoasă" : "Temă întunecată"}
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      <div className="luxury-content">
        <motion.div
          className="luxury-content-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="luxury-badge"
          >
            <div className="luxury-badge-dot" />
            <Wifi className="luxury-badge-icon" />
            <span className="luxury-badge-text">Netheris Status • ONLINE</span>
            <Crown
              className="luxury-badge-icon"
              style={{ width: 14, height: 14 }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="luxury-logo"
          >
            <div className="luxury-logo-glow" />
            <img src={netherLogo} alt="Netheris" className="luxury-logo-img" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="luxury-title"
          >
            NETHERIS
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="luxury-subtitle"
          >
            Netheris - Legends start here!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <button onClick={copyIP} className="luxury-ip">
              <Globe className="luxury-ip-icon" />
              <code className="luxury-ip-code">{SERVER_IP}</code>
              <span className="luxury-ip-divider" />
              {copied ? (
                <div className="luxury-ip-copied">
                  <Check size={16} />
                  <span>COPIED</span>
                </div>
              ) : (
                <div className="luxury-ip-copy">
                  <Copy size={16} />
                  <span>COPY</span>
                </div>
              )}
            </button>
          </motion.div>

          <motion.div
            className="luxury-stats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="luxury-stat"
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <stat.icon className="luxury-stat-icon" />
                <div className="luxury-stat-value">{stat.value}</div>
                <div className="luxury-stat-label">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="luxury-links"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            {links.map((link) => (
              <motion.div
                key={link.id}
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                {link.external ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="luxury-link"
                  >
                    <div className={`luxury-link-icon ${link.className}`}>
                      {link.id === "discord" && (
                        <svg
                          className="luxury-link-svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                        </svg>
                      )}
                    </div>
                    <span className="luxury-link-label">{link.label}</span>
                  </a>
                ) : (
                  <Link to={link.href} className="luxury-link">
                    <div className={`luxury-link-icon ${link.className}`}>
                      {link.id === "store" && (
                        <svg
                          className="luxury-link-svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
                          <path d="M2 7h20" />
                          <path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7" />
                        </svg>
                      )}
                      {link.id === "panel" && (
                        <ExternalLink className="luxury-link-svg" />
                      )}
                    </div>
                    <span className="luxury-link-label">{link.label}</span>
                  </Link>
                )}
              </motion.div>
            ))}
          </motion.div>

          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="luxury-footer"
          >
            <p className="luxury-footer-text">NETHERIS - NETWORK</p>
            <div className="luxury-footer-divider">
              <span className="luxury-footer-divider-line" />
              <Sparkles className="luxury-footer-divider-icon" size={10} />
              <span className="luxury-footer-divider-line" />
            </div>
            <p className="luxury-footer-copyright">
              © 2026 • ALL RIGHTS RESERVED
            </p>
          </motion.footer>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
