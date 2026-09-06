import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenResponse {
  token: string;
  expires: Date;
}

export interface AuthTokens {
  access: TokenResponse;
  refresh: TokenResponse;
}

const generateToken = (userId: string, sessionId: string, secret: string, expiresIn: string): TokenResponse => {
  const payload = { userId, sessionId };
const token = jwt.sign(payload, secret, { expiresIn: expiresIn as any });
  
  // Custom parsing for simple strings like '15m' or '7d' logic to deduce future date
  let timeInMs = 0;
  if(expiresIn.endsWith('m')){
      timeInMs = parseInt(expiresIn) * 60 * 1000;
  } else if(expiresIn.endsWith('d')){
      timeInMs = parseInt(expiresIn) * 24 * 60 * 60 * 1000;
  }

  const expires = new Date(Date.now() + timeInMs);
  return { token, expires };
};

export const generateAuthTokens = (userId: string, sessionId: string): AuthTokens => {
  const access = generateToken(userId, sessionId, env.JWT_SECRET, env.JWT_ACCESS_EXPIRY);
  const refresh = generateToken(userId, sessionId, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_EXPIRY);

  return { access, refresh };
};

