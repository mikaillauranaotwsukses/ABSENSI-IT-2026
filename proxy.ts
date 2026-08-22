import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /portal-it-admin/* routes (except login page)
  if (
    request.nextUrl.pathname.startsWith('/portal-it-admin') &&
    !request.nextUrl.pathname.startsWith('/portal-it-admin/login') &&
    !user
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/portal-it-admin/login';
    return NextResponse.redirect(url);
  }

  // Redirect logged-in admin away from login page
  if (request.nextUrl.pathname === '/portal-it-admin/login' && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/portal-it-admin';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/portal-it-admin/:path*'],
};
