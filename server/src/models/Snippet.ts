import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ISnippet extends Document {
  title: string;
  owner: Types.ObjectId;
  html: string;
  css: string;
  js: string;
  isPublic: boolean;
  views: number;
  forks: number;
  lastSavedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SnippetSchema = new Schema<ISnippet>({
  title: { type: String, required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  html: { type: String, default: '' },
  css: { type: String, default: '' },
  js: { type: String, default: '' },
  isPublic: { type: Boolean, default: true },
  views: { type: Number, default: 0 },
  forks: { type: Number, default: 0 },
  lastSavedAt: { type: Date },
}, { timestamps: true });

export const Snippet: Model<ISnippet> = mongoose.model<ISnippet>('Snippet', SnippetSchema);
