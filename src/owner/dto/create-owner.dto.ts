import { IsString, IsEmail, IsArray, IsNotEmpty, IsMongoId, IsDate, IsOptional } from 'class-validator';
import { Types } from 'mongoose';

export class CreateOwnerDto {
  @IsString()
  @IsNotEmpty()
  nom: string;

  @IsString()
  postnom: string;

  @IsString()
  @IsNotEmpty()
  prenom: string;


  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsArray()
  @IsNotEmpty()
  types: string[];

  @IsString()
  @IsNotEmpty()
  idFilePath: string;

  @IsArray()
  @IsNotEmpty()
  propertyTitlePaths: string[];

  @IsMongoId()
  user: Types.ObjectId;

  @IsOptional()
  @IsDate()
  subscriptionEndDate?: Date;

  // Optional - set by server if not provided
  @IsOptional()
  @IsString()
  subscriptionType?: string;
}

export interface OwnerMetaDto {
  types: string[];
  form: {
    nom: string;
    postnom: string;
    prenom: string;
    phone: string;
    address: string;
  };
  propTitleFiles?: string[];
  subscriptionEndDate?: Date;
  subscriptionType?: 'freemium' | 'monthly' | 'commission';
}
