"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController"); // Correctly import authentication functions
const router = (0, express_1.Router)();
// Public routes for user registration and login
router.post('/register', authController_1.register); // Handles POST requests to /api/auth/register
router.post('/login', authController_1.login); // Handles POST requests to /api/auth/login
exports.default = router;
