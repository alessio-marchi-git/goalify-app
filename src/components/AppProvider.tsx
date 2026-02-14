'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSupabaseTaskStore } from '@/store/supabaseTaskStore';

export function AppProvider({ children }: { children: React.ReactNode }) {
    const initialize = useSupabaseTaskStore((state) => state.initialize);
    const pathname = usePathname();

    useEffect(() => {
        // Don't initialize on public pages
        const publicPages = ['/login', '/reset-password'];
        const isPublicPage = publicPages.includes(pathname) || pathname.startsWith('/auth/');

        if (!isPublicPage) {
            initialize();
        }
    }, [initialize, pathname]);

    return <>{children}</>;
}
