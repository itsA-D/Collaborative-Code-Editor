import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

UserSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    ret.password = undefined;
    return ret;
  }
});

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
