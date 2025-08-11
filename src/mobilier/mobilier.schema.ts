import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Mobilier extends Document {
  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  commune: string;

  @Prop({ required: true })
  prix: number;

  @Prop()
  chambres: number;

  @Prop()
  cuisine: number;

  @Prop()
  salon: number;

  @Prop()
  salleDeBain: number;

  @Prop()
  adresse: string;

  @Prop()
  gps: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ required: true })
  statut: string;

  @Prop({ type: Types.ObjectId, ref: 'Agent', required: true })
  agent: Types.ObjectId;

  @Prop({ required: true })
  site_id: string; // Référence au site auquel appartient le mobilier
}

export const MobilierSchema = SchemaFactory.createForClass(Mobilier);
