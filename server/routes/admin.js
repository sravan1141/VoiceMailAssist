'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db');

function requireAdmin(req, res, next) {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!req.user.is_admin) return res.status(403).json({ error: 'Admin access required' });
    return next();
}

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get('/users', requireAdmin, (req, res) => {
    try {
        const users = db.getAllUsersWithStats();
        res.json({ ok: true, users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get('/stats', requireAdmin, (req, res) => {
    try {
        const stats = db.getPlatformStats();
        res.json({ ok: true, stats });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PUT /api/admin/users/:id/toggle-admin ─────────────────────────────────────
router.put('/users/:id/toggle-admin', requireAdmin, (req, res) => {
    try {
        const user = db.findById(Number(req.params.id));
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot change your own admin status' });
        const newStatus = user.is_admin ? 0 : 1;
        db.setAdminStatus(user.id, newStatus);
        res.json({ ok: true, is_admin: newStatus });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────
router.delete('/users/:id', requireAdmin, (req, res) => {
    try {
        const user = db.findById(Number(req.params.id));
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
        db.deleteUser(user.id);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/admin/users/:id/analytics ────────────────────────────────────────
router.get('/users/:id/analytics', requireAdmin, (req, res) => {
    try {
        const data = db.getUserFullAnalytics(Number(req.params.id));
        if (!data) return res.status(404).json({ error: 'User not found' });
        res.json({ ok: true, analytics: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/admin/activity ───────────────────────────────────────────────────
router.get('/activity', requireAdmin, (req, res) => {
    try {
        const activity = db.getRecentActivity(60);
        res.json({ ok: true, activity });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/admin/system ─────────────────────────────────────────────────────
router.get('/system', requireAdmin, (req, res) => {
    try {
        const mem = process.memoryUsage();
        const stats = db.getPlatformStats();
        res.json({
            ok: true,
            system: {
                uptime: Math.floor(process.uptime()),
                nodeVersion: process.version,
                platform: process.platform,
                memHeapUsed: Math.round(mem.heapUsed / 1024 / 1024),
                memHeapTotal: Math.round(mem.heapTotal / 1024 / 1024),
                memRss: Math.round(mem.rss / 1024 / 1024),
                pid: process.pid,
                dbStats: {
                    users: stats.totalUsers,
                    contacts: stats.totalContacts,
                    whatsappMessages: stats.totalWhatsApp,
                    telegramMessages: stats.totalTelegram,
                }
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/admin/errors ─────────────────────────────────────────────────────
router.get('/errors', requireAdmin, (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(__dirname, '../../error.log');
        if (!fs.existsSync(logPath)) {
            return res.json({ ok: true, lines: [] });
        }
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.split('\n').filter(Boolean).slice(-100).reverse();
        res.json({ ok: true, lines });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
