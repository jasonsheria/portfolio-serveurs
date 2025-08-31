// src/payment/dto/payment.dto.ts
import { IsNotEmpty, IsNumber, IsString, IsObject, ValidateNested, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { CardPaymentDetails, MobilePaymentDetails } from '../interfaces/payment-details.interface';

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

    @IsObject()
    @ValidateNested()
    @Type(() => Object)
    paymentDetails: {
        cardHolderName?: string;
        cardNumber?: string;
        expiryDate?: string;
        cvv?: string;
        mobileNumber?: string;
    };

    @ValidateIf(o => ['visa', 'mastercard'].includes(o.paymentMethod))
    validateCardDetails() {
        const details = this.paymentDetails;
        if (!details.cardHolderName || !details.cardNumber || !details.expiryDate || !details.cvv) {
            return false;
        }
        if (details.cardNumber.length !== 16) {
            return false;
        }
        if (details.cvv.length !== 3) {
            return false;
        }
        const [month, year] = details.expiryDate.split('/');
        return !(!month || !year || +month > 12 || +month < 1);
    }

    @ValidateIf(o => o.paymentMethod === 'mobilemoney')
    validateMobileDetails() {
        const details = this.paymentDetails;
        return details.mobileNumber && details.mobileNumber.length === 9;
    }
}