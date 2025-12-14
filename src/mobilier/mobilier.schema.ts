import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, strict: false }) // strict: false permet d'ajouter des champs dynamiquement
export class Mobilier extends Document {
  @Prop({ required: true })
  titre: string; // Titre de l'annonce

  @Prop({ required: true })
  type: string; // Terrain, Appartement, Villa, Place commerciale, etc.

  @Prop({ required: true })
  categorie: string; // Location ou Vente

  @Prop({ required: true })
  commune: string;

  @Prop({ required: true })
  quartier: string;

  @Prop({ required: true })
  prix: number;

  @Prop()
  devise: string; // USD, CDF, etc.

  @Prop({ type: String, default: 'disponible' })
  statut: string; // disponible, loué, vendu, reservé

  // Localisation
  @Prop({ required: true })
  adresse: string;

  @Prop({ type: [Number], required: true }) // [longitude, latitude]
  coordonnees: number[];

  @Prop()
  reference: string; // Numéro de référence unique du bien

  // Caractéristiques générales
  @Prop()
  surface: number; // en m²

  @Prop()
  description: string;

  @Prop({ type: [String], default: [] })
  equipements: string[]; // Liste des équipements

  @Prop({ type: [String], default: [] })
  commodites: string[]; // Commodités à proximité

  // Caractéristiques spécifiques aux logements
  @Prop()
  chambres: number;

  @Prop()
  salles_de_bain: number;

  @Prop()
  toilettes: number;

  @Prop()
  cuisines: number;

  @Prop()
  salons: number;

  @Prop()
  balcons: number;

  @Prop()
  parking: number; // Nombre de places de parking

  @Prop()
  etage: number; // Pour les appartements

  @Prop()
  ascenseur: boolean;

  // Caractéristiques spécifiques aux terrains
  @Prop()
  superficie: number; // en m²

  @Prop()
  titrePropriete: boolean;

  @Prop()
  certificatEnregistrement: boolean;

  @Prop()
  planCadastral: boolean;

  // Caractéristiques spécifiques aux commerces
  @Prop()
  typeCommerce: string; // Boutique, Magasin, Bureau, etc. 

  @Prop()
  surfaceVitrine: number;

  @Prop()
  hauteurPlafond: number;

  // Médias
  @Prop({ type: [String], default: [] })
  images: string[]; // URLs des images

  @Prop({ type: [String], default: [] })
  videos: string[]; // URLs des vidéos

  @Prop({ type: String })
  modelisation3D: string; // URL de la modélisation 3D

  // Documents
  @Prop({ type: [String], default: [] })
  documents: string[]; // URLs des documents (titre de propriété, etc.)

  // Promotion fields
  @Prop({ type: Boolean, default: false })
  promotion: boolean;

  @Prop()
  promoPrice: number;

  @Prop()
  promoStart: Date;

  @Prop()
  promoEnd: Date;

  @Prop()
  promoComment: string;

  // Relations
  @Prop({ 
    type: Types.ObjectId,
    required: true,
    refPath: 'proprietaireType' // Référence dynamique basée sur proprietaireType
  })
  proprietaire: Types.ObjectId;

  @Prop({ 
    type: String, 
    required: true,
    enum: ['User', 'Agent', 'Owner'] 
  })
  proprietaireType: string; // Détermine le type de propriétaire

  @Prop({ type: Types.ObjectId, ref: 'Site' })
  site: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Agent', required: false })
  agent?: Types.ObjectId; // Agent assigned to this property (nullable)

  // Conditions de location/vente
  @Prop()
  garantieLocative: number;

  @Prop()
  chargesIncluses: boolean;

  @Prop({ type: [String], default: [] })
  conditionsPaiement: string[];

  @Prop()
  disponibilite: Date;

  // Statistiques et métadonnées
  @Prop({ default: 0 })
  vues: number;

  @Prop({ default: 0 })
  favoris: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Visit' }] })
  visites: Types.ObjectId[];

  @Prop({ type: Boolean, default: false })
  estVerifie: boolean;

  @Prop()
  noteVerification: string;
}

export const MobilierSchema = SchemaFactory.createForClass(Mobilier);
