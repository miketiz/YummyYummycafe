import { NextRequest, NextResponse } from "next/server";

const ADMIN_USERNAME = process.env.ADMIN_BASIC_AUTH_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_BASIC_AUTH_PASSWORD || "admin123";

function unauthorizedResponse() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="YummyYummy Admin", charset="UTF-8"',
    },
  });
}

function verifyBasicAuth(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) {
    return false;
  }

  try {
    const encoded = header.slice(6);
    const decoded = atob(encoded);
    const separator = decoded.indexOf(":");
    if (separator === -1) {
      return false;
    }

    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/")) {
    if (!verifyBasicAuth(request)) {
      return unauthorizedResponse();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
