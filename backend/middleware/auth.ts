import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            userId?: string;
            userEmail?: string;
        }
    }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
    }

    const token = authHeader.split(' ')[1] as string;
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        console.error('JWT_SECRET is not configured in environment variables');
        res.status(500).json({ success: false, message: 'Server configuration error' });
        return;
    }

    try {
        const decoded = jwt.verify(token, jwtSecret) as unknown as { userId: string; emailId: string };
        req.userId = decoded.userId;
        req.userEmail = decoded.emailId;
        next();
    } catch {
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};