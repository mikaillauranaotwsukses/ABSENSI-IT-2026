import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase environment variables are missing on Vercel, redirect unauthenticated admin traffic safely
  if (!url || !key) {
    if (
      request.nextUrl.pathname.startsWith('/portal-it-admin') &&
      !request.nextUrl.pathname.startsWith('/portal-it-admin/login')
    ) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/portal-it-admin/login';
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Protect /portal-it-admin/* routes (except login page)
    if (
      request.nextUrl.pathname.startsWith('/portal-it-admin') &&
      !request.nextUrl.pathname.startsWith('/portal-it-admin/login') &&
      !user
    ) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/portal-it-admin/login';
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect logged-in admin away from login page
    if (request.nextUrl.pathname === '/portal-it-admin/login' && user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/portal-it-admin';
      return NextResponse.redirect(redirectUrl);
    }
  } catch (error) {
    console.error('Middleware auth check error:', error);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/portal-it-admin/:path*'],
};
