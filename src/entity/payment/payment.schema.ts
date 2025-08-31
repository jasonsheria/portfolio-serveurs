import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Types } from 'mongoose';
import { User } from '../users/user.schema';
import { Site } from '../site/site.schema';
@Schema()
export class Payment extends Document {
    @Prop({ type: Types.ObjectId, ref: 'User', required: false })
    client: User;

    @Prop({ type: Types.ObjectId, ref: 'Site', required: false })
    site: Site;

    @Prop({ required: true })
    amount: number;

    @Prop({ required: true })
    currency: string;

    @Prop({ required: true })
    paymentMethod: string;

    @Prop({ required: true })
    status: string;

    @Prop({ required: true })
    freshpayPaymentId: string;

    @Prop({ type: Object, required: true })
    metadata: {
        accountId: string;
        accountType: string;
        plan: string;
    };

    @Prop({ type: Object, required: false })
    paymentDetails: {
        cardHolderName?: string;
        cardNumber?: string;
        expiryDate?: string;
        cvv?: string;
        mobileNumber?: string;
    };

    @Prop({ default: Date.now })
    createdAt: Date;

    @Prop()
    completedAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
