// ===== src/seed.ts =====
import bcrypt from "bcryptjs";
import { initializeSchema, dbRun, dbGet } from "./models/database";
import dotenv from "dotenv";

dotenv.config();

async function seed() {
  console.log("🌱 Initializing schema...");
  await initializeSchema();
  console.log("🌱 Seeding database...");

  // ===== USERS =====
  const users = [
    { username: "NeneaExo", password: "admin123", role: "admin", email: "admin@netheris.ro" },
    { username: "theol", password: "mod123", role: "moderator", email: "theol@netheris.ro" },
    { username: "Dragos_MC", password: "helper123", role: "helper", email: "dragos@netheris.ro" },
    { username: "xAlexPro", password: "mod123", role: "moderator", email: "alex@netheris.ro" },
    { username: "CristiRO", password: "helper123", role: "helper", email: "cristi@netheris.ro" },
    { username: "Player123", password: "player123", role: "player", email: "player@test.ro" },
  ];

  for (const user of users) {
    const existing = await dbGet("SELECT id FROM users WHERE username = ?", [user.username]);
    if (!existing) {
      const hash = await bcrypt.hash(user.password, 12);
      const result = await dbRun(
        `INSERT INTO users (username, password_hash, role, email) VALUES (?, ?, ?, ?)`,
        [user.username, hash, user.role, user.email]
      );
      if (["admin", "moderator", "helper"].includes(user.role)) {
        await dbRun("INSERT OR IGNORE INTO staff_status (user_id) VALUES (?)", [result.lastID]);
      }
      console.log(`✅ User: ${user.username} (${user.role})`);
    }
  }

  const admin = await dbGet<{ id: number }>("SELECT id FROM users WHERE role = 'admin' LIMIT 1");

  // ===== RULES =====
  const rules = [
    { category: "Comportament", title: "Respectul față de jucători", content: "Toți jucătorii trebuie să se comporte cu respect față de ceilalți membri ai comunității. Insulte, jigniri sau hărțuirea altor jucători nu sunt tolerate.", severity: "warning", order_index: 1 },
    { category: "Comportament", title: "Limbaj adecvat", content: "Limbajul vulgar, rasist sau discriminatoriu este strict interzis în orice canal de comunicare (chat, Discord, forum).", severity: "warning", order_index: 2 },
    { category: "Comportament", title: "Spam și publicitate", content: "Spam-ul în chat și publicitatea pentru alte servere este complet interzisă și se sancționează cu ban permanent.", severity: "severe", order_index: 3 },
    { category: "Gameplay", title: "Cheat-uri și hacks", content: "Utilizarea oricăror tipuri de cheat-uri, hacks sau modificări care oferă avantaj nedrept este interzisă și se sancționează cu ban permanent.", severity: "severe", order_index: 1 },
    { category: "Gameplay", title: "Bug abuse", content: "Exploatarea bug-urilor serverului este interzisă. Dacă descoperi un bug, raportează-l imediat la staff.", severity: "warning", order_index: 2 },
    { category: "Gameplay", title: "Conturi multiple", content: "Este interzis să ai mai mult de un cont activ. Conturile multiple vor fi banate fără avertisment.", severity: "severe", order_index: 3 },
    { category: "Staff", title: "Respectul față de staff", content: "Respectarea deciziilor staff-ului este obligatorie. Contestațiile se fac prin apeluri oficiale, nu prin argumente în chat.", severity: "warning", order_index: 1 },
    { category: "General", title: "Regulile Discord", content: "Toate regulile se aplică și pe serverul nostru de Discord. Comportamentul neadecvat va fi sancționat.", severity: "info", order_index: 1 },
  ];

  if (admin) {
    for (const rule of rules) {
      const existing = await dbGet("SELECT id FROM rules WHERE title = ?", [rule.title]);
      if (!existing) {
        await dbRun(
          `INSERT INTO rules (category, title, content, severity, order_index, created_by, created_by_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [rule.category, rule.title, rule.content, rule.severity, rule.order_index, "NeneaExo", admin.id]
        );
        console.log(`✅ Rule: ${rule.title}`);
      }
    }
  }

  // ===== ANNOUNCEMENTS =====
  if (admin) {
    const announcements = [
      { title: "🔥 Eveniment Weekend — Dublu XP!", content: "În acest weekend toți jucătorii beneficiază de XP x2. Evenimentul durează până duminică la miezul nopții!", pinned: 1 },
      { title: "⚙️ Maintenance programat", content: "Mâine între 03:00 - 05:00 server-ul va fi offline pentru update. Pregătiți-vă!", pinned: 0 },
      { title: "🏆 Sezonul I — Clasament final", content: "Sezonul I se apropie de final! Top 3 jucători vor fi recompensați cu grade permanente.", pinned: 0 },
    ];
    for (const ann of announcements) {
      const existing = await dbGet("SELECT id FROM announcements WHERE title = ?", [ann.title]);
      if (!existing) {
        await dbRun(
          `INSERT INTO announcements (title, content, pinned, author, author_id) VALUES (?, ?, ?, ?, ?)`,
          [ann.title, ann.content, ann.pinned, "NeneaExo", admin.id]
        );
        console.log(`✅ Announcement: ${ann.title}`);
      }
    }
  }

  // ===== MODERATION ACTIONS =====
  if (admin) {
    const actions = [
      { type: "ban", target: "HackerXD123", by: "theol", reason: "Hacking / Cheats", duration: "permanent" },
      { type: "mute", target: "SpammerRo", by: "Dragos_MC", reason: "Spam în chat", duration: "1d" },
      { type: "kick", target: "AFK_Player99", by: "NeneaExo", reason: "AFK prea mult timp", duration: null },
      { type: "warn", target: "NoisyKid", by: "theol", reason: "Limbaj neadecvat", duration: null },
      { type: "unban", target: "OldPlayer2020", by: "NeneaExo", reason: "Apel acceptat", duration: null },
    ];
    for (const action of actions) {
      await dbRun(
        `INSERT INTO moderation_actions (type, target_username, performed_by, performed_by_id, reason, duration) VALUES (?, ?, ?, ?, ?, ?)`,
        [action.type, action.target, action.by, admin.id, action.reason, action.duration]
      );
    }
    console.log(`✅ Moderation actions: ${actions.length}`);
  }

  // ===== TICKETS =====
  const player = await dbGet<{ id: number }>("SELECT id FROM users WHERE username = 'Player123'");
  if (player) {
    const ticketsData = [
      { title: "Nu mă pot conecta la server", content: "Primesc eroarea 'Connection refused' când încerc să mă conectez.", category: "support", priority: "high" },
      { title: "Am pierdut itemele din inventar", content: "După relogare inventarul meu era gol. Aveam 64 diamante și armură completă.", category: "bug", priority: "medium" },
      { title: "Raport player toxic", content: "Jucătorul 'XYZ_Toxic' mă insultă și face spam în chat.", category: "complaint", priority: "low" },
    ];
    for (const ticket of ticketsData) {
      await dbRun(
        `INSERT INTO tickets (title, content, category, priority, created_by, created_by_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [ticket.title, ticket.content, ticket.category, ticket.priority, "Player123", player.id]
      );
    }
    console.log(`✅ Tickets: ${ticketsData.length}`);
  }

  // ===== SERVER STATS 24h =====
  const playersByHour = [45, 32, 21, 38, 89, 156, 234, 289, 312, 387, 421, 356, 310, 278, 245, 267, 312, 389, 421, 398, 356, 310, 245, 207];
  for (let i = 23; i >= 0; i--) {
    const hoursAgo = new Date(Date.now() - i * 3600000).toISOString().replace("T", " ").slice(0, 19);
    await dbRun(
      `INSERT INTO server_stats (players_online, players_max, tps, ram_used, ram_max, uptime, recorded_at) VALUES (?, 500, ?, ?, 4096, ?, ?)`,
      [playersByHour[23 - i], (19.5 + Math.random() * 0.5).toFixed(1), 1024 + Math.floor(Math.random() * 512), i * 3600, hoursAgo]
    );
  }
  console.log("✅ Server stats: 24 ore de date");

  console.log("");
  console.log("🎉 Seed complet!");
  console.log("📋 Conturi: NeneaExo/admin123, theol/mod123, Dragos_MC/helper123, Player123/player123");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
