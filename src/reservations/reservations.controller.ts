
import { Controller, Post as HttpPost, Body, Request, UseGuards, Get } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  // Confirmer une réservation
  @UseGuards(JwtAuthGuard)
  @HttpPost('confirm')
  async confirmReservation(@Request() req, @Body() body: any) {
    const userIdRaw = req.user?._id || req.user?.userId || req.user?.sub || req.user?.id;
    return this.reservationsService.confirmReservation(userIdRaw, body.reservationId);
  }

  // Rejeter/annuler une réservation
  @UseGuards(JwtAuthGuard)
  @HttpPost('reject')
  async rejectReservation(@Request() req, @Body() body: any) {
    const userIdRaw = req.user?._id || req.user?.userId || req.user?.sub || req.user?.id;
    return this.reservationsService.rejectReservation(userIdRaw, body.reservationId);
  }

  @UseGuards(JwtAuthGuard)
  @HttpPost()
  async createReservation(@Request() req, @Body() body: any) {
    const userIdRaw = req.user?._id || req.user?.userId || req.user?.sub || req.user?.id;
    return this.reservationsService.createReservation(userIdRaw, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async listMyReservations(@Request() req) {
    const userIdRaw = req.user?._id || req.user?.userId || req.user?.sub || req.user?.id;
    return this.reservationsService.findByUser(userIdRaw);
  }
  // methode deleteReservation to delete a reservation by id
  @UseGuards(JwtAuthGuard)
  @HttpPost('delete')
  async deleteReservation(@Request() req, @Body() body: any) {
    const userIdRaw = req.user?._id || req.user?.userId || req.user?.sub || req.user?.id;
    return this.reservationsService.deleteReservation(userIdRaw, body.reservationId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('owner-reservations')
  async listOwnerReservations(@Request() req) {
    const userIdRaw = req.user?._id || req.user?.userId || req.user?.sub || req.user?.id;
    return this.reservationsService.findByOwner(userIdRaw);
  }
}
