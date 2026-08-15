import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const PUBLIC_PATHS = ['/login'];

interface CookieInput {
  name: string;
  value: string;
  options?: CookieOptions;
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies: CookieInput[]) => {
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  const isAdmin = role === 'admin';
  const pathname = request.nextUrl.pathname;
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico';

  if ((!user || !isAdmin) && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (user && isAdmin && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
