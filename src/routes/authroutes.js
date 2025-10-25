const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/userSchema");

router
  .post("/auth/signup", async (req, res) => {
    console.log(req.body);
    const { password } = req.body;
    console.log(password);
    try {
      const data = await new User(req.body).save();
      const token = jwt.sign({ userId: data._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      res.cookie("token", token, { httpOnly: true });
      res.status(201).json({
        success: true,
        token: token,
        user: {
          id: data._id,
          name: data.name,
          email: data.email,
        },
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  })
  .post("/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ error: "Invalid email or password" });
      }
      if (user) {
        const match = await bcrypt.compare(password, user.password);
        if (match) {
          const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: "7d",
          });
          res.cookie("token", token, { httpOnly: true });
          return res.status(200).json({
            success: true,
            token: token,
            user: {
              id: user._id,
              name: user.name,
              email: user.email,
            },
          });
        }
        return res.status(400).json({ error: "Invalid email or password" });
      }
    } catch (err) {
      return res.status(500).json({ error: "Server error" });
    }
  })
  .post("/auth/logout", authMiddleware, (req, res) => {
    try {
      res.clearCookie("token");
      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  })
  .get("/auth/verify", (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      return res.status(200).json({
        success: true,
        valid: true,
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
  })
  .get("/auth/me", authMiddleware, async (req, res) => {
    try {
      const data = await User.findOne({ _id: req.userId });

      res.status(200).json({
        success: true,
        user: {
          id: data._id,
          name: data.name,
          email: data.email,
        },
      });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

module.exports = router;
