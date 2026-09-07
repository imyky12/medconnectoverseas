import { AuthPayload } from '../middleware/auth';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      /**
       * The signed-in admin, attached by `adminAuth`.
       *
       * The token only carries an id, but the activity log stores names so a row
       * still reads correctly after an account is removed. The middleware loads
       * the record anyway to check `isActive`, so this costs nothing extra.
       */
      admin?: { id: string; name: string; email: string };
      /** Student display name/email, attached by `auth`, for the same reason. */
      actorName?: string;
      actorEmail?: string;
    }
  }
}
