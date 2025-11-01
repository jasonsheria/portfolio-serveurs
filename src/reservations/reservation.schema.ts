import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, strict: false })
export class Reservation extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Mobilier', required: true })
  property: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  user?: Types.ObjectId; // user who made the reservation (may be anonymous)

  @Prop()
  date?: string;

  @Prop()
  time?: string;

  @Prop()
  phone?: string;

  @Prop()
  amount?: number;

  @Prop()
  status?: string; // pending, confirmed, cancelled
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);
