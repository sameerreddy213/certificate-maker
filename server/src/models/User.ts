import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string; // Corrected this line
}

const UserSchema = new Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, { timestamps: true });

export default model<IUser>('User', UserSchema);