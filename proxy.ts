import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const publicRoutes = ["/sign-in", "/sign-up", "/api/auth"];
const authRoutes = ["/sign-in", "/sign-up"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and static files
  if (
    publicRoutes.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    // Check if authenticated user is trying to access auth pages
    if (authRoutes.some((route) => pathname.startsWith(route))) {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (session) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  // Check authentication for protected routes
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
