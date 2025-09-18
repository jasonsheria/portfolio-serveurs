import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Types } from 'mongoose';
import { User } from '../users/user.schema';

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: User;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  recipient: User;

  @Prop({ required: false })
  content: string;

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: null })
  readAt?: Date;

  @Prop({ default: false })
  isFile: boolean;

  @Prop({ required: false })
  originalName?: string;

  @Prop({ required: false })
  filename?: string;

  @Prop({ required: false })
  type?: string;

  @Prop({ required: false })
  path?: string;

  @Prop({ required: false })
  size?: number;

  @Prop({ type: [{ text: String, date: { type: Date, default: Date.now } }] })
  replies?: { text: string; date: Date }[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId: Types.ObjectId;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
