import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, strict: false })
export class Reservation extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Mobilier', required: true })
  property: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  user?: Types.ObjectId; // user who made the reservation (may be anonymous)

  @Prop({ type: Types.ObjectId, ref: 'Owner', required: false })
  owner?: Types.ObjectId; // owner of the property

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

  @Prop()
  name? : string
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);
