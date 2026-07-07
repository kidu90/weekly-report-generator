import mongoose, { Document, Schema } from "mongoose";

export interface IProject extends Document {
  name: string;
  description: string;
  createdBy: string;
  members: string[];
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    createdBy: { type: String, ref: "User", required: true },
    members: [{ type: String, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model<IProject>("Project", projectSchema);
