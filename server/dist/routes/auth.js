"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const templateController_1 = require("../controllers/templateController");
const authMiddleware_1 = require("../middleware/authMiddleware"); // Import the middleware
const router = (0, express_1.Router)();
// Apply the 'protect' middleware to both routes
router.route('/').get(authMiddleware_1.protect, templateController_1.getTemplates).post(authMiddleware_1.protect, templateController_1.createTemplate);
exports.default = router;
