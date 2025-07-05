"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
// The 'register' function with its full implementation
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { fullName, email, password } = req.body;
    try {
        // Check if user already exists
        let user = yield User_1.default.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // Create a new user
        user = new User_1.default({
            fullName,
            email,
            password,
        });
        // Hash password
        const salt = yield bcryptjs_1.default.genSalt(10);
        user.password = yield bcryptjs_1.default.hash(password, salt);
        yield user.save();
        // Create a JSON Web Token
        const payload = {
            user: {
                id: user.id,
            },
        };
        jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET || 'your_default_secret', { expiresIn: '1h' }, (err, token) => {
            if (err)
                throw err;
            res.status(201).json({ token });
        });
    }
    catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
    }
});
exports.register = register;
// The 'login' function
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        // Check if user exists
        const user = yield User_1.default.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        // Check password
        const isMatch = yield bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        // Create and return a JSON Web Token for the session
        const payload = {
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
            },
        };
        jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET || 'your_default_secret', { expiresIn: '1h' }, (err, token) => {
            if (err)
                throw err;
            res.json({ token });
        });
    }
    catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
    }
});
exports.login = login;
