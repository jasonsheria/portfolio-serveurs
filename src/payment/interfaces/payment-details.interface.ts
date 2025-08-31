export interface CardPaymentDetails {
    cardHolderName: string;
    cardNumber: string;
    expiryDate: string;
    cvv: string;
}

export interface MobilePaymentDetails {
    mobileNumber: string;
}

export type PaymentDetails = CardPaymentDetails | MobilePaymentDetails;
