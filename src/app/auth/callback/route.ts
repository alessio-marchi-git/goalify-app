import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    // Validate redirect path to prevent open redirect attacks
    const safePath = next.startsWith('/') && !next.startsWith('//') ? next : '/';

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            return NextResponse.redirect(`${origin}${safePath}`);
        }
    }

    // Return to login on error
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
