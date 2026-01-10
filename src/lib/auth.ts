import { NextRequest, NextResponse } from 'next/server';

/**
 * Authentication result containing token
 */
export interface AuthResult {
  token: string;
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Middleware: Extract JWT token from Authorization header
 * Returns 401 if token is missing
 * Note: Token verification is handled by the backend API
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, auth: AuthResult) => Promise<NextResponse>
): Promise<NextResponse> {
  const token = extractBearerToken(request);

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: 'Missing authentication token',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      },
      { status: 401 }
    );
  }

  const auth: AuthResult = {
    token,
  };

  return handler(request, auth);
}

/**
 * Middleware: Extract JWT token and forward to backend
 * Backend will verify token and check for admin or superadmin role
 * Returns 401 if token is missing
 */
export async function withAdminAuth(
  request: NextRequest,
  handler: (request: NextRequest, auth: AuthResult) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(request, handler);
}

/**
 * Middleware: Extract JWT token and forward to backend
 * Backend will verify token and check for superadmin role only
 * Returns 401 if token is missing
 */
export async function withSuperAdminAuth(
  request: NextRequest,
  handler: (request: NextRequest, auth: AuthResult) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(request, handler);
}

