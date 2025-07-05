"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const batchController_1 = require("../controllers/batchController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.route('/')
    .get(authMiddleware_1.protect, batchController_1.getBatches)
    .post(authMiddleware_1.protect, batchController_1.createBatch);
router.route('/:id/certificates')
    .get(authMiddleware_1.protect, batchController_1.getCertificatesForBatch);
exports.default = router;
