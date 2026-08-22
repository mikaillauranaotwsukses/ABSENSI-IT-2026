import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vomaluikqvcryocefoke.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbWFsdWlrcXZjcnlvY2Vmb2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNjA1OTYsImV4cCI6MjEwMjkzNjU5Nn0.vXXUKihuEx3f3o5oe-h-6NuCyKISVcdVCg4G5etUCTo';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
