import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  // Google returned an error (e.g. user cancelled login)
  if (oauthError) {
    console.warn("OAuth cancelled or denied:", oauthError);
    return NextResponse.redirect(`${origin}/login?error=Login cancelled`);
  }

  // No code and no error — unexpected state, send back to login
  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name, options) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;

    return NextResponse.redirect(`${origin}/evaluate`);
  } catch (err) {
    console.error("OAuth error:", err);
    return NextResponse.redirect(`${origin}/login?error=Authentication failed`);
  }
}
