import { IsString, IsOptional, IsNotEmpty, IsEmail, Length } from 'class-validator';

export class CreateAgentDto {
  @IsString()
  @IsNotEmpty()
  prenom: string; // first name

  @IsString()
  @IsNotEmpty()
  nom: string; // last name

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  adresse?: string;

  @IsString()
  @IsNotEmpty()
  telephone: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  facebook?: string;

  @IsString()
  @IsOptional()
  linkedin?: string;

  @IsString()
  @IsOptional()
  twitter?: string;

  @IsString()
  @IsOptional()
  messenger?: string;

  @IsString()
  @IsNotEmpty()
  site_id: string;
}
