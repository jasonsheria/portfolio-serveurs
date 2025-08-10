import {IsBoolean, IsString, IsNumber } from "class-validator"
export class CreateStripeDto {

    @IsNumber()
    amount : String;
    @IsString()
    currency : string

}
