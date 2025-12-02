import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, strict: false })
export class Vehicule extends Document {
  @Prop({ required: true })
  nom: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  type: string; // ex: SUV, Berline, Camionette

  @Prop({ required: true })
  prix: number;

  @Prop()
  devise: string;

  @Prop({ type: String, default: 'disponible' })
  statut: string; // vente, location, etc.

  @Prop()
  adresse: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: [String], default: [] })
  videos: string[];

  @Prop({ type: Types.ObjectId, refPath: 'proprietaireType' })
  proprietaire: Types.ObjectId;

  @Prop({ type: String, enum: ['User', 'Agent', 'Owner'], required: true })
  proprietaireType: string;

  @Prop({ type: Types.ObjectId, ref: 'Site' })
  site: Types.ObjectId;

  // Vehicle specific
  @Prop()
  agentId: String;

  @Prop()
  fraisVisite: Number;

  @Prop()
  couleur: String;

  @Prop()
  kilometrage: Number;

  @Prop()
  annee: Number;

  @Prop()
  carburant: String;

  @Prop()
  transmission: String;

  @Prop()
  places: Number;

  // Stats
  @Prop({ default: 0 })
  vues: number;

  @Prop({ default: 0 })
  favoris: number;
}

export const VehiculeSchema = SchemaFactory.createForClass(Vehicule);
