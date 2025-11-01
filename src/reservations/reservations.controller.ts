import { Controller, Post as HttpPost, Body, Request, UseGuards, Get } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @UseGuards(JwtAuthGuard)
  @HttpPost()
  async createReservation(@Request() req, @Body() body: any) {
    const userIdRaw = req.user?._id || req.user?.userId || req.user?.sub || req.user?.id;
    return this.reservationsService.createReservation(userIdRaw, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async listMyReservations(@Request() req) {
    console.log("Fetching reservations for user:", req.user);
    const userIdRaw = req.user?._id || req.user?.userId || req.user?.sub || req.user?.id;
    return this.reservationsService.findByUser(userIdRaw);
  }
}
