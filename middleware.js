import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const path = req.nextUrl.pathname;

    if (isAuth) {
      // If onboarding is NOT completed, force them to /onboarding
      // Check for !true to catch false, undefined, or null
      if (token.onboardingCompleted !== true) {
        if (!path.startsWith("/onboarding")) {
          return NextResponse.redirect(new URL("/onboarding", req.url));
        }
      }
      // If onboarding IS completed, prevent them from visiting /onboarding
      else {
        if (path.startsWith("/onboarding")) {
          return NextResponse.redirect(new URL("/", req.url));
        }
      }
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => true,
    },
  }
);

export const config = {
  // Exclude API, static files, login, signup, AND image assets from middleware
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|signup|posters|.*\\.(?:jpg|jpeg|gif|png|webp|svg)).*)"],
};
