"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const templateController_1 = require("../controllers/templateController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.route('/')
    .get(authMiddleware_1.protect, templateController_1.getTemplates)
    .post(authMiddleware_1.protect, templateController_1.createTemplate);
// Add this line for deleting a specific template
router.route('/:id')
    .delete(authMiddleware_1.protect, templateController_1.deleteTemplate);
exports.default = router;
