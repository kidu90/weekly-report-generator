import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/database";
import authRoutes from "./routes/auth";
import reportRoutes from "./routes/reports";
import projectRoutes from "./routes/projects";
import dashboardRoutes from "./routes/dashboard";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.get("/", (_req, res) => {
  res.send("API is running...");
});

// Route mounts
app.use("/api/projects", projectRoutes);
app.use("/api/reports", reportRoutes);
// app.use("/api/auth", authRoutes);
// app.use("/api/dashboard", dashboardRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
