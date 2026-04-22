import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  // Google returned an error (e.g. user cancelled login)
  if (oauthError) {
    return NextResponse.redirect(`${origin}/login?error=Login cancelled`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=No code`);
  }

  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => cookieStore.get(name)?.value,
          set: (name, value, options) => {
            cookieStore.set({ name, value, ...options });
          },
          remove: (name, options) => {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("OAuth exchange error:", error);
      return NextResponse.redirect(`${origin}/login?error=OAuth failed`);
    }

    return NextResponse.redirect(`${origin}/evaluate`);
  } catch (err) {
    console.error("Callback route error:", err);
    return NextResponse.redirect(`${origin}/login?error=Authentication failed`);
  }
}
