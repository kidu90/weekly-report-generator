import "dotenv/config";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/database";
import authRoutes from "./routes/auth";
import reportRoutes from "./routes/reports";
import projectRoutes from "./routes/projects";
import dashboardRoutes from "./routes/dashboard";
import { createMcpRouter } from "./mcp/server";

const app = express();

app.use(
  cors({
    exposedHeaders: ["mcp-session-id", "mcp-protocol-version"],
  }),
);
app.use(express.json());

connectDB();

app.get("/", (_req, res) => {
  res.send("API is running...");
});

// Route mounts
app.use("/api/projects", projectRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/mcp", createMcpRouter());
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
