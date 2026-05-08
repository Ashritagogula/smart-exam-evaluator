import express from "express";
import { login, register, getMe, logout } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/login",    login);
router.post("/register", register);
router.get("/me",        authenticate, getMe);
router.post("/logout",   authenticate, logout);

export default router;
