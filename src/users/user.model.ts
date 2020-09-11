import * as mongoose from 'mongoose';
import User from './user.interface';

const addressSchema = new mongoose.Schema({
  city: String,
  street: String,
  country: String
});

const userSchema = new mongoose.Schema({
  email: String,
  firstName: String,
  lastName: String,
  password: String,
  address: addressSchema,
  twoFactorAuthenticationCode: String,
  isTwoFactorAuthenticationEnabled: Boolean
});

const userModel = mongoose.model<User & mongoose.Document>('User', userSchema);

export default userModel;
