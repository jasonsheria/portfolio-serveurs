
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

  @Prop()
  image: string; // URL de la photo de profil

  @Prop({ required: true })
  site_id: string; // Référence au site auquel appartient l'agent
}

export const AgentSchema = SchemaFactory.createForClass(Agent);
