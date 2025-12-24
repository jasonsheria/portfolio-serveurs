import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reservation } from './reservation.schema';
import { Mobilier } from '../mobilier/mobilier.schema';
import { Vehicule } from '../vehicule/vehicule.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReservationsService {
    private readonly logger = new Logger(ReservationsService.name);
    constructor(
        @InjectModel(Reservation.name) private reservationModel: Model<Reservation>,
        @InjectModel(Mobilier.name) private mobilierModel: Model<Mobilier>,
        @InjectModel(Vehicule.name) private vehiculeModel: Model<Vehicule>,
        private readonly notificationsService: NotificationsService,
    ) { }

    // Confirme une réservation et notifie user/owner
    async confirmReservation(userId: string | Types.ObjectId | undefined, reservationIdRaw: string) {
        if (!reservationIdRaw || typeof reservationIdRaw !== 'string') {
            throw new BadRequestException('reservationId is required');
        }
        let reservationId: Types.ObjectId;
        try {
            reservationId = new Types.ObjectId(reservationIdRaw);
        } catch (e) {
            throw new BadRequestException('Invalid reservationId format');
        }
        const reservation = await this.reservationModel.findById(reservationId).populate('property').exec();
        if (!reservation) {
            throw new BadRequestException('Reservation not found');
        }
        reservation.status = 'confirmed';
        await reservation.save();
        // Notification to owner and user
        try {
            const ownerId = reservation.owner?.toString?.() ?? reservation.owner;
            const senderId = reservation.user?.toString?.() ?? reservation.user;
            const titleOwner = 'Réservation confirmée';
            const messageOwner = `votre annonce a une réservation confirmée pour le ${reservation.date || ''} ${reservation.time || ''} avec le client.`;
            await this.notificationsService.create({
                user: ownerId,
                senderId,
                title: titleOwner,
                message: messageOwner,
                source: 'reservation',
                isRead: false,
            });
            if (senderId && senderId !== ownerId) {
                const titleSender = 'Votre réservation a été confirmée';
                const messageSender = `Votre réservation pour le ${reservation.date || ''} ${reservation.time || ''} a été confirmée.`;
                await this.notificationsService.create({
                    user: senderId,
                    senderId: ownerId,
                    title: titleSender,
                    message: messageSender,
                    source: 'reservation',
                    isRead: false,
                });
            }
        } catch (e) {
            this.logger.warn('[ReservationsService] failed to create confirmation notification', e);
        }
        return reservation;
    }

    // Rejette/annule une réservation et notifie user/owner
    async rejectReservation(userId: string | Types.ObjectId | undefined, reservationIdRaw: string) {
        if (!reservationIdRaw || typeof reservationIdRaw !== 'string') {
            throw new BadRequestException('reservationId is required');
        }
        let reservationId: Types.ObjectId;
        try {
            reservationId = new Types.ObjectId(reservationIdRaw);
        } catch (e) {
            throw new BadRequestException('Invalid reservationId format');
        }
        const reservation = await this.reservationModel.findById(reservationId).populate('property').exec();
        if (!reservation) {
            throw new BadRequestException('Reservation not found');
        }
        reservation.status = 'cancelled';
        await reservation.save();
        // Notification to owner and user
        try {
            const ownerId = reservation.owner?.toString?.() ?? reservation.owner;
            const senderId = reservation.user?.toString?.() ?? reservation.user;
            const titleOwner = 'Réservation annulée';
            const messageOwner = `La réservation pour le ${reservation.date || ''} ${reservation.time || ''} a été annulée.`;
            await this.notificationsService.create({
                user: ownerId,
                senderId,
                title: titleOwner,
                message: messageOwner,
                source: 'reservation',
                isRead: false,
            });
            if (senderId && senderId !== ownerId) {
                const titleSender = 'Votre réservation a été annulée';
                const messageSender = `Votre réservation pour le ${reservation.date || ''} ${reservation.time || ''} a été annulée.`;
                await this.notificationsService.create({
                    user: senderId,
                    senderId: ownerId,
                    title: titleSender,
                    message: messageSender,
                    source: 'reservation',
                    isRead: false,
                });
            }
        } catch (e) {
            this.logger.warn('[ReservationsService] failed to create rejection notification', e);
        }
        return reservation;
    }

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
        console.log("Creating reservation for propertyId:", propertyId.toString());

        const mobilier = await this.mobilierModel.findById(propertyId).exec();
        const vehicule = await this.vehiculeModel.findById( propertyId).exec();
       

        if (!mobilier && !vehicule) {
            console.log("property not found");
            throw new BadRequestException('Property not found');
        }
        const ownerId = mobilier?.proprietaire || vehicule?.proprietaire;
        console.log("ownerId", ownerId);
        const reservationDoc = await this.reservationModel.create({
            property: propertyId,
            user: userId ? new Types.ObjectId(userId.toString()) : undefined,
            date: body.date,
            owner : ownerId? new Types.ObjectId(ownerId.toString()) : undefined, 
            time: body.time,
            phone: body.phone,
            amount: body.amount,
            status: 'pending',
            expired: false,
            name : body.name,
        });
        console.log("Reservation created:", reservationDoc);

        // Create a notification for the property owner and for the reserving user
        try {
            const senderId = userId ? (userId.toString?.() ?? userId) : undefined;

            if (ownerId) {
                const ownerTarget = ownerId.toString ? ownerId.toString() : ownerId;
                const titleOwner = 'Nouvelle réservation';
                const messageOwner = `Votre bien "${mobilier?.titre || vehicule?.nom || 'votre annonce'}" a été réservé pour le ${body.date || ''} ${body.time || ''}`;

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
                    const messageSender = `Votre réservation pour "${mobilier?.titre || vehicule?.nom || 'le bien'}" le ${body.date || ''} ${body.time || ''} a bien été enregistrée.`;
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
                const results = await this.reservationModel.find(q).sort({ createdAt: -1 }).lean().exec();
                if (Array.isArray(results) && results.length > 0) {
                    this.logger.log(`findByUser: found ${results.length} reservations for query ${JSON.stringify(q)}`);
                    return {data : results};
                }
            }

            this.logger.log(`findByUser: no reservations found for user ${uid}`);
            return [];
            
            
                    } catch (err) {
            this.logger.error('[ReservationsService] findByUser error', err?.stack || err);
            return [];
        }
    }

    async deleteReservation(userId: string | Types.ObjectId | undefined, reservationIdRaw: string) {
        if (!userId) {
            throw new BadRequestException('User ID is required');
        }
        if (!reservationIdRaw || typeof reservationIdRaw !== 'string') {
            throw new BadRequestException('reservationId is required');
        }

        let reservationId: Types.ObjectId;
        try {
            reservationId = new Types.ObjectId(reservationIdRaw);
        } catch (e) {
            throw new BadRequestException('Invalid reservationId format');
        }

        const reservation = await this.reservationModel.findOne({
            _id: reservationId,
            user: typeof userId === 'string' ? new Types.ObjectId(userId) : userId,
        }).exec();

        if (!reservation) {
            throw new BadRequestException('Reservation not found or access denied');
        }

        await this.reservationModel.deleteOne({ _id: reservationId }).exec();
        return { message: 'Reservation deleted successfully' };
    }
    async findByOwner(ownerId: string | Types.ObjectId | undefined) {
        this.logger.log(`findByOwner called with: ${JSON.stringify(ownerId)}`);
        if (!ownerId) return [];
        try {
            const oid = typeof ownerId === 'string' ? ownerId : (ownerId as any).toString();
            this.logger.log(`owner id resolved to string: ${oid}`);

            const tryQueries: any[] = [];
            // common possibilities
            tryQueries.push({ owner: oid });
            try {
                tryQueries.push({ owner: new Types.ObjectId(oid) });
            } catch (e) {
                // ignore invalid object id
            }
            tryQueries.push({ ownerId: oid });
            tryQueries.push({ 'owner._id': oid });

            for (const q of tryQueries) {
                this.logger.debug(`findByOwner attempting query: ${JSON.stringify(q)}`);
                const results = await this.reservationModel.find(q).sort({ createdAt: -1 }).populate('property').lean().exec();
                if (Array.isArray(results) && results.length > 0) {
                    this.logger.log(`findByOwner: found ${results.length} reservations for query ${JSON.stringify(q)}`);
                    return {data : results};
                }
            }

            this.logger.log(`findByOwner: no reservations found for owner ${oid}`);
            return [];
            
            
                    } catch (err) {
            this.logger.error('[ReservationsService] findByOwner error', err?.stack || err);
            return [];
        }
    }
}
