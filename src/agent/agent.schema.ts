import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Agent extends Document {
  @Prop({ required: true })
  nom: string;

  @Prop({ required: true })
  prenom: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  adresse: string;

  @Prop({ required: true })
  telephone: string; // WhatsApp
}

export const AgentSchema = SchemaFactory.createForClass(Agent);
