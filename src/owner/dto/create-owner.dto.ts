import { IsString, IsEmail, IsArray, IsNotEmpty, IsMongoId } from 'class-validator';
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

  @IsEmail()
  @IsNotEmpty()
  email: string;

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
}

export interface OwnerMetaDto {
  types: string[];
  form: {
    nom: string;
  postnom: string;
    prenom: string;
    email: string;
    phone: string;
    address: string;
  };
  propTitleFiles: string[];
}
