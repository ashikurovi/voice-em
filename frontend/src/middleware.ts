import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Helper function to verify JWT on the Edge
async function verifyAuth(token: string) {
  try {
    // In production, ensure this secret matches exactly with your Express backend
    const secret = new TextEncoder().encode('fallback_secret_key');
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (err) {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  const role = req.cookies.get('role')?.value; // Fast-path check
  
  const { pathname } = req.nextUrl;

  // 1. Protect Admin Routes
  if (pathname.startsWith('/admin')) {
    if (!token || role !== 'SUPERADMIN') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    
    const payload = await verifyAuth(token);
    if (!payload) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  // 2. Protect User Dashboard
  if (pathname === '/') {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    
    const payload = await verifyAuth(token);
    if (!payload) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  // 3. Allow public access to /login and /register
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/admin/:path*'],
};
