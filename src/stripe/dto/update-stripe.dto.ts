import { PartialType } from '@nestjs/mapped-types';
import { CreateStripeDto } from './create-stripe.dto';
import {IsBoolean, IsString, IsNumber } from "class-validator"

export class UpdateStripeDto extends PartialType(CreateStripeDto) {
    @IsNumber()
    amount: String;
    @IsString()
    currency: string
}
