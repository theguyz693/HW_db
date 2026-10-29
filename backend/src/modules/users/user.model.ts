// ──────────────────────────────────────────────
// User Mongoose model
// ──────────────────────────────────────────────

import mongoose, { Schema, type Document, type Model } from 'mongoose';
import bcrypt from 'bcrypt';

// ── Subdocument interfaces ──

interface IRefreshToken {
  token: string;
  deviceInfo: string;
  createdAt: Date;
  expiresAt: Date;
}

interface IDashboardWidget {
  widgetId: string;
  position: number;
  visible: boolean;
  config: Record<string, unknown>;
}

interface IUserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultView: 'gallery' | 'compact' | 'shelf' | 'table' | 'timeline';
  language: string;
  dashboardWidgets: IDashboardWidget[];
}

interface IUserPrivacy {
  profilePublic: boolean;
  collectionsPublicByDefault: boolean;
}

interface IUserStats {
  totalItems: number;
  totalCollections: number;
  totalValue: number;
  memberSince: Date;
}

// ── Main User interface ──

export interface IUser extends Document {
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  avatar: string | null;
  bio: string;
  preferences: IUserPreferences;
  privacy: IUserPrivacy;
  stats: IUserStats;
  refreshTokens: IRefreshToken[];
  role: 'user' | 'moderator' | 'admin';
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// ── Schema definition ──

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    token: { type: String, required: true },
    deviceInfo: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { _id: false },
);

const dashboardWidgetSchema = new Schema<IDashboardWidget>(
  {
    widgetId: { type: String, required: true },
    position: { type: Number, required: true },
    visible: { type: Boolean, default: true },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      default: '',
      maxlength: 500,
    },
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'dark' },
      defaultView: {
        type: String,
        enum: ['gallery', 'compact', 'shelf', 'table', 'timeline'],
        default: 'gallery',
      },
      language: { type: String, default: 'en' },
      dashboardWidgets: { type: [dashboardWidgetSchema], default: [] },
    },
    privacy: {
      profilePublic: { type: Boolean, default: false },
      collectionsPublicByDefault: { type: Boolean, default: false },
    },
    stats: {
      totalItems: { type: Number, default: 0 },
      totalCollections: { type: Number, default: 0 },
      totalValue: { type: Number, default: 0 },
      memberSince: { type: Date, default: Date.now },
    },
    refreshTokens: { type: [refreshTokenSchema], default: [] },
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin'],
      default: 'user',
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      // Never expose sensitive fields in JSON serialization
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.refreshTokens;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// ── Instance methods ──

userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// ── Static methods / model ──

export const UserModel: Model<IUser> = mongoose.model<IUser>('User', userSchema);
