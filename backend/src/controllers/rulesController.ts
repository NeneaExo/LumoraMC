// ===== src/controllers/rulesController.ts =====

import { Request, Response } from "express";
import { dbRun, dbGet, dbAll } from "../models/database";
import { Rule } from "../types";

// GET /api/rules
export async function getRules(req: Request, res: Response): Promise<void> {
  try {
    const rules = await dbAll<Rule>(
      `SELECT * FROM rules WHERE active = 1 ORDER BY category, order_index ASC`
    );

    const grouped: Record<string, Rule[]> = {};
    for (const rule of rules) {
      if (!grouped[rule.category]) grouped[rule.category] = [];
      grouped[rule.category].push(rule);
    }

    res.json({ success: true, rules, grouped });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// GET /api/rules/all — inclusiv inactive (admin)
export async function getAllRules(req: Request, res: Response): Promise<void> {
  try {
    const rules = await dbAll<Rule>(`SELECT * FROM rules ORDER BY category, order_index ASC`);
    res.json({ success: true, rules });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// POST /api/rules — admin only
export async function createRule(req: Request, res: Response): Promise<void> {
  try {
    const { category, title, content, severity = "warning", order_index = 0 } = req.body;

    if (!category || !title || !content) {
      res.status(400).json({ success: false, message: "Categorie, titlu și conținut obligatorii" });
      return;
    }

    const result = await dbRun(
      `INSERT INTO rules (category, title, content, severity, order_index, created_by, created_by_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [category.trim(), title.trim(), content.trim(), severity, order_index, req.user!.username, req.user!.userId]
    );

    const rule = await dbGet<Rule>("SELECT * FROM rules WHERE id = ?", [result.lastID]);
    res.status(201).json({ success: true, message: "Regulă adăugată", rule });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// PUT /api/rules/:id — admin only
export async function updateRule(req: Request, res: Response): Promise<void> {
  try {
    const existing = await dbGet("SELECT * FROM rules WHERE id = ?", [req.params.id]);
    if (!existing) {
      res.status(404).json({ success: false, message: "Regulă negăsită" });
      return;
    }

    const { category, title, content, severity, order_index, active } = req.body;
    await dbRun(
      `UPDATE rules SET
        category = COALESCE(?, category),
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        severity = COALESCE(?, severity),
        order_index = COALESCE(?, order_index),
        active = COALESCE(?, active),
        updated_at = datetime('now')
       WHERE id = ?`,
      [
        category || null, title || null, content || null, severity || null,
        order_index !== undefined ? order_index : null,
        active !== undefined ? (active ? 1 : 0) : null,
        req.params.id
      ]
    );

    const updated = await dbGet<Rule>("SELECT * FROM rules WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "Regulă actualizată", rule: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// DELETE /api/rules/:id — admin only
export async function deleteRule(req: Request, res: Response): Promise<void> {
  try {
    const existing = await dbGet("SELECT * FROM rules WHERE id = ?", [req.params.id]);
    if (!existing) {
      res.status(404).json({ success: false, message: "Regulă negăsită" });
      return;
    }

    await dbRun("DELETE FROM rules WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "Regulă ștearsă" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}

// PUT /api/rules/reorder — admin only
export async function reorderRules(req: Request, res: Response): Promise<void> {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      res.status(400).json({ success: false, message: "Format invalid" });
      return;
    }

    for (const item of orders) {
      await dbRun("UPDATE rules SET order_index = ? WHERE id = ?", [item.order_index, item.id]);
    }

    res.json({ success: true, message: "Ordine actualizată" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare internă server" });
  }
}
