import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../users/user.schema';

@Schema({ timestamps: true })
export class Evenement extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Owner', required: true })
  ownerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ required: true })
  content: string;

  @Prop({ default: Date.now })
  date: Date;
  
    @Prop({ default: 'pending' })
    status: string; // pending, confirmed, cancelled
  
    @Prop({ type: Types.ObjectId, ref: 'Reservation', required: false })
    reservationId?: Types.ObjectId;
}

export const EvenementSchema = SchemaFactory.createForClass(Evenement);
