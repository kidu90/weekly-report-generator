import mongoose, { Document, Schema, Types } from "mongoose";

export type ReportStatus = "draft" | "submitted";
export type TaskField = string | string[];

export interface IReport extends Document {
  owner: string;
  weekStart: Date;
  weekEndDate: Date;
  project: Types.ObjectId;
  tasksCompleted: TaskField;
  tasksPlanned: TaskField;
  blockers: TaskField;
  hoursWorked?: number;
  notes?: string;
  status: ReportStatus;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const taskFieldSchema = {
  type: Schema.Types.Mixed,
  required: true,
  validate: {
    validator(value: unknown): boolean {
      if (typeof value === "string") {
        return value.trim().length > 0;
      }

      if (Array.isArray(value)) {
        return value.length > 0 && value.every((item) => typeof item === "string" && item.trim().length > 0);
      }

      return false;
    },
    message: "Must be a non-empty string or a non-empty array of strings",
  },
};

const reportSchema = new Schema<IReport>(
  {
    owner: { type: String, ref: "User", required: true },
    weekStart: { type: Date, required: true },
    weekEndDate: { type: Date, required: true },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    tasksCompleted: taskFieldSchema,
    tasksPlanned: taskFieldSchema,
    blockers: taskFieldSchema,
    hoursWorked: { type: Number, min: 0, max: 168 },
    notes: { type: String, trim: true },
    status: { type: String, enum: ["draft", "submitted"], default: "draft" },
    submittedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IReport>("Report", reportSchema);
