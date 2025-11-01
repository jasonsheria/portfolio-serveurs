import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../users/user.schema';
@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User;

  // Optional sender (user who triggered the notification)
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  sender?: User | string;

  // Short title shown in the notification list/UI
  @Prop({ required: false })
  title?: string;

  // Full message/body
  @Prop({ required: false })
  message?: string;

  // Backwards-compatible content/source fields
  @Prop({ required: false })
  content?: string;

  @Prop({ required: false })
  source?: string;

  // Whether the notification was read by the user
  @Prop({ default: false })
  isRead: boolean;

  // Timestamp - createdAt is provided by timestamps: true
  @Prop({ default: Date.now })
  date: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
