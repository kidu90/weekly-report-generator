import mongoose, { Document, Schema } from "mongoose";
import type { UserRole } from "../middleware/auth";

export interface IUser extends Document {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["Manager", "TeamMember"], required: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    _id: false,
    versionKey: false,
  }
);

export default mongoose.model<IUser>("User", userSchema);
