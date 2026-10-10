import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.js';
import { UserRepository, PatientProfileRepository } from '../models/repositories.js';
import { IUser } from '../models/types.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  tokenPayload?: TokenPayload;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token missing or malformed',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  if (!payload) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token is invalid or expired',
      code: 'TOKEN_EXPIRED',
    });
    return;
  }

  const user = await UserRepository.findById(payload.userId);
  if (!user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'User account no longer exists',
    });
    return;
  }

  if (user.accountStatus === 'suspended') {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Account has been suspended by an administrator or doctor',
      code: 'ACCOUNT_SUSPENDED',
    });
    return;
  }

  req.user = user;
  req.tokenPayload = payload;
  next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
}

// Ensure the requesting doctor is assigned to the specified patient
export async function authorizeDoctorForPatient(
  doctorId: string,
  patientId: string
): Promise<boolean> {
  const profile = await PatientProfileRepository.findByPatientId(patientId);
  if (!profile) return false;
  return profile.assignedDoctorIds.includes(doctorId);
}
