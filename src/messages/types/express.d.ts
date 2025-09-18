import { Request } from 'express';
import { User } from '../../entity/users/user.schema';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}