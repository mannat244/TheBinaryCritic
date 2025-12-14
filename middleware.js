import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const path = req.nextUrl.pathname;

    if (isAuth) {
      // If onboarding is NOT completed, force them to /onboarding
      if (token.onboardingCompleted === false) {
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|signup).*)"],
};
