// src/payment/dto/payment.dto.ts
import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class CreatePaymentDto {
    @IsNotEmpty()
    @IsString()
    accountId: string;

    @IsNotEmpty()
    @IsString()
    accountType: string;

    @IsNotEmpty()
    @IsString()
    plan: string;

    @IsNotEmpty()
    @IsNumber()
    amount: number;

    @IsNotEmpty()
    @IsString()
    paymentMethod: string;

    @IsString()
    currency: string = 'USD';

    // Pour les paiements par carte
    @IsOptional()
    @IsString()
    cardHolderName?: string;

    @IsOptional()
    @IsString()
    cardNumber?: string;

    @IsOptional()
    @IsString()
    expiryDate?: string;

    @IsOptional()
    @IsString()
    cvv?: string;

    // Pour les paiements mobiles
    @IsOptional()
    @IsString()
    mobileNumber?: string;

    @IsOptional()
    @IsString()
    siteId?: string;
}