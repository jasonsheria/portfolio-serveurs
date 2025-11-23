// src/users/dto/create-user.dto.ts
import { IsOptional, IsBoolean, IsEmail, IsNumber, IsString, MinLength } from 'class-validator';

export class CreateUserDto {

  @IsString()
  @IsOptional()
  username ?: string;
  @IsEmail({ })
  email: string;
  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;
  @IsString()
    @IsOptional()
  telephone?: string | null;
  @IsString()
    @IsOptional()
  profileUrl?: string; // Utilisé pour la photo de profil Google
  @IsString()
    @IsOptional()
  logo?: string; // Logo optionnel
  @IsString()
    @IsOptional()
  address?: string; // Adresse optionnelle
  @IsString()
    @IsOptional()
  city?: string; // Ville optionnelle
  @IsString()
    @IsOptional()
  country?: string; // Pays optionnel
  @IsString()
    @IsOptional()
  postalCode?: string; // Code postal optionnel
  @IsString()
    @IsOptional() 
  description?: string; // Description optionnelle
  @IsString()
    @IsOptional()
  website?: string; // Site web optionnel
  @IsString()
    @IsOptional()
  socialMedia?: string; // Réseaux sociaux optionnels
  @IsString()
    @IsOptional()
  companyName?: string; // Nom de l'entreprise optionnel
  @IsString()
    @IsOptional()
  companyDescription?: string; // Description de l'entreprise optionnelle
  @IsString()
    @IsOptional()
  companyWebsite?: string; // Site web de l'entreprise optionnel
  @IsString()
    @IsOptional()
  companyLogo?: string; // Logo de l'entreprise optionnel
  @IsString()
    @IsOptional()
  companyAddress?: string; // Adresse de l'entreprise optionnelle
  @IsString()
    @IsOptional()
  companyPhone?: string; // Téléphone de l'entreprise optionnel
  @IsString()
    @IsOptional()
  companyEmail?: string; // Email de l'entreprise optionnel
  @IsString()
    @IsOptional()
  companySocialMedia?: string; // Réseaux sociaux de l'entreprise optionnels
  @IsString()
    @IsOptional()
  domaine?: string; // Domaine optionnel
  @IsString()
    @IsOptional()
  expertise?: string; // Expertise optionnelle
  @IsBoolean()
    @IsOptional()
  isVerified?: boolean;
  @IsString()
    @IsOptional()
  verificationToken?: string;
  @IsBoolean()
    @IsOptional()

  isGoogleAuth?: boolean;
}