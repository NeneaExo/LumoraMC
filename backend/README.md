# 🔥 Netheris Panel — Backend API

Backend complet pentru panelul Netheris. Built cu **Node.js + Express + TypeScript + SQLite + WebSocket**.

---

## 📦 Setup — Pornire rapidă

```bash
# 1. Intră în folder
cd netheris-backend

# 2. Instalează dependențele
npm install

# 3. Configurează .env (editează dacă vrei)
# JWT_SECRET, MINECRAFT_API_KEY etc.

# 4. Populează baza de date cu date de test
npm run seed

# 5. Pornește serverul în dev mode
npm run dev
```

Serverul pornește pe **http://localhost:3001**

---

## 🔑 Conturi de test (după seed)

| Username   | Parola      | Rol        |
|------------|-------------|------------|
| NeneaExo   | admin123    | Admin      |
| theol      | mod123      | Moderator  |
| Dragos_MC  | helper123   | Helper     |
| Player123  | player123   | Player     |

---

## 📡 Endpoints API

### Autentificare
```
POST   /api/auth/register          — Creare cont
POST   /api/auth/login             — Login → returnează JWT token
POST   /api/auth/logout            — Logout (Auth)
GET    /api/auth/me                — Date utilizator curent (Auth)
GET    /api/auth/users             — Lista utilizatori (Admin)
PUT    /api/auth/users/:id/role    — Schimbă rol (Admin)
```

### Tickete
```
GET    /api/tickets                — Lista tickete (Auth)
GET    /api/tickets/:id            — Detalii ticket + reply-uri (Auth)
POST   /api/tickets                — Creează ticket (Auth)
PUT    /api/tickets/:id            — Actualizează ticket (Staff)
POST   /api/tickets/:id/reply      — Adaugă reply (Auth)
DELETE /api/tickets/:id            — Șterge ticket (Admin)
```

### Regulament
```
GET    /api/rules                  — Toate regulile active (Public)
GET    /api/rules/all              — Toate regulile incl. inactive (Admin)
POST   /api/rules                  — Adaugă regulă (Admin)
PUT    /api/rules/reorder          — Reordonează (Admin)
PUT    /api/rules/:id              — Editează (Admin)
DELETE /api/rules/:id              — Șterge (Admin)
```

### Anunțuri
```
GET    /api/announcements          — Lista anunțuri (Public)
GET    /api/announcements/:id      — Detalii anunț (Public)
POST   /api/announcements          — Crează anunț (Mod+)
PUT    /api/announcements/:id      — Editează (Mod+)
DELETE /api/announcements/:id      — Șterge (Mod+)
```

### Moderare
```
GET    /api/moderation             — Lista acțiuni (Staff)
GET    /api/moderation/recent      — Ultimele 10 (Staff)
GET    /api/moderation/player/:u   — Istoricul unui jucător (Staff)
POST   /api/moderation             — Adaugă acțiune (Mod+)
```

### Minecraft Plugin (X-API-Key header)
```
POST   /api/minecraft/players/sync         — Sync lista jucători online
POST   /api/minecraft/players/:uuid/join   — Jucător s-a conectat
POST   /api/minecraft/players/:uuid/quit   — Jucător a ieșit
POST   /api/minecraft/stats                — Update statistici server
POST   /api/minecraft/staff/:u/status      — Update status staff MC
POST   /api/minecraft/moderation           — Raportare acțiune moderare

GET    /api/minecraft/players              — Jucători online (Staff)
GET    /api/minecraft/stats/history        — Grafic 24h (Admin)
GET    /api/minecraft/staff                — Status staff (Staff)
```

---

## 🔌 WebSocket

Conectare: `ws://localhost:3001/ws?token=YOUR_JWT_TOKEN`

### Evenimente trimise de server:
```
connected              — Confirmare conexiune
minecraft:players_update  — Jucători online actualizați
minecraft:player_join     — Jucător nou conectat
minecraft:player_quit     — Jucător a ieșit
server:stats_update       — Statistici server
staff:status_update       — Status staff actualizat
ticket:new                — Ticket nou creat
ticket:updated            — Ticket actualizat
ticket:reply              — Reply nou la ticket
announcement:new          — Anunț nou
announcement:updated      — Anunț actualizat
announcement:deleted      — Anunț șters
moderation:action         — Acțiune de moderare
```

---

## 🎮 Integrare Plugin Minecraft

Plugin-ul Java trebuie să trimită un header `X-API-Key` cu valoarea din `.env`.

### Exemplu sincronizare jucători (la fiecare 30s):
```json
POST /api/minecraft/players/sync
X-API-Key: minecraft_plugin_secret_key_2026

{
  "players": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "username": "ProGamer_RO",
      "ip": "185.xxx.xxx.12",
      "world": "survival",
      "ping": 23,
      "joinedAt": "2026-03-07T10:30:00Z"
    }
  ]
}
```

### Exemplu statistici server (la fiecare minut):
```json
POST /api/minecraft/stats
X-API-Key: minecraft_plugin_secret_key_2026

{
  "players_online": 207,
  "players_max": 500,
  "tps": 19.8,
  "ram_used": 2048,
  "ram_max": 4096,
  "uptime": 86400
}
```

---

## 🔐 Sistemul de roluri

| Rol        | Poate face                                              |
|------------|---------------------------------------------------------|
| Admin      | Tot — inclusiv gestionare utilizatori, regulament      |
| Moderator  | Ban/Mute, tickete, anunțuri, vizualizare jucători      |
| Helper     | Tickete, vizualizare staff, acțiuni limitate           |
| Player     | Creare tickete, vizualizare regulament și anunțuri     |

---

## 🗂️ Structură proiect

```
netheris-backend/
├── src/
│   ├── controllers/
│   │   ├── authController.ts        — Login, register, users
│   │   ├── ticketsController.ts     — CRUD tickete + reply-uri
│   │   ├── rulesController.ts       — Regulament (admin edit)
│   │   ├── announcementsController.ts — Anunțuri
│   │   ├── moderationController.ts  — Acțiuni ban/mute/etc
│   │   └── minecraftController.ts   — Date de la plugin
│   ├── middleware/
│   │   └── auth.ts                  — JWT + verificare roluri
│   ├── models/
│   │   └── database.ts              — SQLite schema + init
│   ├── routes/
│   │   └── index.ts                 — Toate rutele
│   ├── types/
│   │   └── index.ts                 — Tipuri TypeScript
│   ├── websocket/
│   │   └── wsServer.ts              — WebSocket real-time
│   ├── index.ts                     — Entry point
│   └── seed.ts                      — Date de test
├── .env
├── package.json
└── tsconfig.json
```
