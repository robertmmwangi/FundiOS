import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/dashboard", "/jobs", "/finance", "/reports", "/settings", "/onboarding"];
const authRoutes = ["/login", "/register", "/forgot-password"];

const matchesRoute = (pathname: string, route: string) => {
  return pathname === route || pathname.startsWith(`${route}/`);
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const pathname = request.nextUrl.pathname;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && protectedRoutes.some((route) => matchesRoute(pathname, route))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    const isAuthRoute = authRoutes.some((route) => matchesRoute(pathname, route));
    const isLogoutRoute = pathname === "/auth/logout";
    const isOnboardingRoute = pathname === "/onboarding";

    if (!isLogoutRoute && !isOnboardingRoute) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", user.id)
        .maybeSingle();

      const onboardingComplete = !!profile?.onboarding_complete;

      if (!onboardingComplete) {
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }
    }

    if (isAuthRoute && !isLogoutRoute) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-|icons/|offline|api/webhooks/).*)",
  ],
};
