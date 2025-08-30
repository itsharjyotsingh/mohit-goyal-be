// auth/jwt.ts
import jwt, { JwtPayload } from 'jsonwebtoken';

export interface AppJwtPayload extends JwtPayload {
    email?: string; // add other custom claims as needed
    // sub?: string;
    // role?: string;
}

const JWT_SECRET = process.env.JWT_SECRET!; // for HS256
// For RS256 use a public key instead:
// const JWT_PUBLIC_KEY = fs.readFileSync('path/to/public.pem', 'utf8');

export function verifyJwt(token: string): AppJwtPayload {
    // For HS256:
    const decoded = jwt.verify(token, JWT_SECRET) as string | jwt.JwtPayload;
    // For RS256:
    // const decoded = jwt.verify(token, JWT_PUBLIC_KEY, { algorithms: ['RS256'] });

    if (typeof decoded === 'string') {
        // jsonwebtoken can legally return a string payload; normalize to object
        throw new Error('Unexpected JWT payload type'); // keep strict [6]
    }
    return decoded as AppJwtPayload;
}

export function getBearerToken(authHeader?: string): string | null {
    if (!authHeader) return null;
    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    return token.trim();
}
