import { Request } from 'express';
import { User } from '../../entity/users/user.schema';

// Allow multiple possible id fields because different parts of the codebase
// sometimes attach `userId`, `id` or `_id` to the request.user object.
export interface RequestWithUser extends Request {
    user: User & { id?: string; userId?: string; _id?: any };
}