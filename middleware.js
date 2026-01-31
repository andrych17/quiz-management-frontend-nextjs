import { NextResponse } from 'next/server'

export function middleware(request) {
  const pathname = request.nextUrl.pathname
  const token = request.cookies.get('admin_token')?.value

  // Redirect authenticated users away from login page
  if (pathname === '/admin/login' && token) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/(.*)',
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ]
}
