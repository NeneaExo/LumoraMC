// ===== src/routes/index.ts =====
import { Router } from "express";
import {
  authenticate,
  isAdmin,
  isStaff,
  isMod,
  authenticatePlugin,
} from "../middleware/auth";

import * as auth from "../controllers/authController";
import * as tickets from "../controllers/ticketsController";
import * as rules from "../controllers/rulesController";
import * as announcements from "../controllers/announcementsController";
import * as minecraft from "../controllers/minecraftController";
import * as moderation from "../controllers/moderationController";

const router = Router();

router.post("/auth/register", auth.register);
router.post("/auth/login", auth.login);
router.post("/auth/logout", authenticate, auth.logout);
router.get("/auth/me", authenticate, auth.getMe);
router.get("/auth/staff", authenticate, auth.getStaff);
router.get("/auth/stats", authenticate, auth.getStats);
router.get("/auth/users", authenticate, isAdmin, auth.getUsers);
router.put("/auth/users/:id/role", authenticate, isAdmin, auth.updateUserRole);

router.get("/tickets", authenticate, tickets.getTickets);
router.get("/tickets/:id", authenticate, tickets.getTicket);
router.post("/tickets", authenticate, tickets.createTicket);
router.put("/tickets/:id", authenticate, isStaff, tickets.updateTicket);
router.post("/tickets/:id/reply", authenticate, tickets.replyToTicket);
router.delete("/tickets/:id", authenticate, isAdmin, tickets.deleteTicket);

router.get("/rules", rules.getRules);
router.get("/rules/all", authenticate, isAdmin, rules.getAllRules);
router.post("/rules", authenticate, isAdmin, rules.createRule);
router.put("/rules/reorder", authenticate, isAdmin, rules.reorderRules);
router.put("/rules/:id", authenticate, isAdmin, rules.updateRule);
router.delete("/rules/:id", authenticate, isAdmin, rules.deleteRule);

router.get("/announcements", announcements.getAnnouncements);
router.get("/announcements/:id", announcements.getAnnouncement);
router.post(
  "/announcements",
  authenticate,
  isMod,
  announcements.createAnnouncement,
);
router.put(
  "/announcements/:id",
  authenticate,
  isMod,
  announcements.updateAnnouncement,
);
router.delete(
  "/announcements/:id",
  authenticate,
  isMod,
  announcements.deleteAnnouncement,
);

router.get("/moderation", authenticate, isStaff, moderation.getActions);
router.get(
  "/moderation/recent",
  authenticate,
  isStaff,
  moderation.getRecentActions,
);
router.get(
  "/moderation/player/:username",
  authenticate,
  isStaff,
  moderation.getPlayerHistory,
);
router.post("/moderation", authenticate, isMod, moderation.createAction);

router.post(
  "/minecraft/players/sync",
  authenticatePlugin,
  minecraft.syncPlayers,
);
router.post(
  "/minecraft/players/:uuid/join",
  authenticatePlugin,
  minecraft.playerJoin,
);
router.post(
  "/minecraft/players/:uuid/quit",
  authenticatePlugin,
  minecraft.playerQuit,
);
router.post(
  "/minecraft/stats",
  authenticatePlugin,
  minecraft.updateServerStats,
);
router.post(
  "/minecraft/staff/:username/status",
  authenticatePlugin,
  minecraft.updateStaffStatus,
);
router.post(
  "/minecraft/moderation",
  authenticatePlugin,
  minecraft.reportModerationAction,
);

router.get(
  "/minecraft/players",
  authenticate,
  isStaff,
  minecraft.getOnlinePlayers,
);
router.get(
  "/minecraft/stats/history",
  authenticate,
  isAdmin,
  minecraft.getStatsHistory,
);
router.get("/minecraft/staff", authenticate, isStaff, minecraft.getStaffStatus);

export default router;
