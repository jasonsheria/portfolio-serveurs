import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reservation } from './reservation.schema';
import { Mobilier } from '../mobilier/mobilier.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReservationsService {
    private readonly logger = new Logger(ReservationsService.name);
    constructor(
        @InjectModel(Reservation.name) private reservationModel: Model<Reservation>,
        @InjectModel(Mobilier.name) private mobilierModel: Model<Mobilier>,
        private readonly notificationsService: NotificationsService,
    ) { }

    async createReservation(userId: string | Types.ObjectId | undefined, body: any) {
        const propertyIdRaw = body.propertyId || body.property || body.property_id;
        if (!propertyIdRaw || typeof propertyIdRaw !== 'string') {
            throw new BadRequestException('propertyId is required');
        }

        let propertyId: Types.ObjectId;
        try {
            propertyId = new Types.ObjectId(propertyIdRaw);
        } catch (e) {
            throw new BadRequestException('Invalid propertyId format');
        }

        const mobilier = await this.mobilierModel.findById(propertyId).exec();
        if (!mobilier) {
            throw new BadRequestException('Property not found');
        }

        const reservationDoc = await this.reservationModel.create({
            property: propertyId,
            user: userId ? new Types.ObjectId(userId.toString()) : undefined,
            date: body.date,
            time: body.time,
            phone: body.phone,
            amount: body.amount,
            status: 'pending',
        });

        // Create a notification for the property owner and for the reserving user
        try {
            const ownerId = mobilier.proprietaire;
            const senderId = userId ? (userId.toString?.() ?? userId) : undefined;

            if (ownerId) {
                const ownerTarget = ownerId.toString ? ownerId.toString() : ownerId;
                const titleOwner = 'Nouvelle réservation';
                const messageOwner = `Votre bien "${mobilier.titre || 'votre annonce'}" a été réservé pour le ${body.date || ''} ${body.time || ''}`;

                await this.notificationsService.create({
                    user: ownerTarget,
                    senderId: senderId,
                    title: titleOwner,
                    message: messageOwner,
                    source: 'reservation',
                    isRead: false,
                });

                // Also notify the sender (confirmation) if distinct from owner
                if (senderId && senderId !== ownerTarget) {
                    const titleSender = 'Réservation enregistrée';
                    const messageSender = `Votre réservation pour "${mobilier.titre || 'le bien'}" le ${body.date || ''} ${body.time || ''} a bien été enregistrée.`;
                    try {
                        await this.notificationsService.create({
                            user: senderId,
                            senderId: ownerTarget,
                            title: titleSender,
                            message: messageSender,
                            source: 'reservation',
                            isRead: false,
                        });
                    } catch (innerErr) {
                        // Don't block if sender notification fails
                        console.warn('[ReservationsService] failed to create sender notification', innerErr);
                    }
                }
            }
        } catch (e) {
            // Notification failure should not block reservation creation
            console.warn('[ReservationsService] failed to create notification', e);
        }

        return reservationDoc;
    }

    async findByUser(userId: string | Types.ObjectId | undefined) {
        this.logger.log(`findByUser called with: ${JSON.stringify(userId)}`);
        if (!userId) return [];
        try {
            const uid = typeof userId === 'string' ? userId : (userId as any).toString();
            this.logger.log(`user id resolved to string: ${uid}`);

            const tryQueries: any[] = [];
            // common possibilities
            tryQueries.push({ user: uid });
            try {
                tryQueries.push({ user: new Types.ObjectId(uid) });
            } catch (e) {
                // ignore invalid object id
            }
            tryQueries.push({ userId: uid });
            tryQueries.push({ 'user._id': uid });

            for (const q of tryQueries) {
                this.logger.debug(`findByUser attempting query: ${JSON.stringify(q)}`);
                const results = await this.reservationModel.find(q).sort({ createdAt: -1 }).populate('property').lean().exec();
                if (Array.isArray(results) && results.length > 0) {
                    this.logger.log(`findByUser: found ${results.length} reservations for query ${JSON.stringify(q)}`);
                    return results;
                }
            }

            this.logger.log(`findByUser: no reservations found for user ${uid}`);
            return [];
            
            
                    } catch (err) {
            this.logger.error('[ReservationsService] findByUser error', err?.stack || err);
            return [];
        }
    }
}
