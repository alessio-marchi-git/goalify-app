'use client';

import { useEffect } from 'react';
import { useSupabaseTaskStore } from '@/store/supabaseTaskStore';

export function AppProvider({ children }: { children: React.ReactNode }) {
    const initialize = useSupabaseTaskStore((state) => state.initialize);

    useEffect(() => {
        initialize();
    }, [initialize]);

    return <>{children}</>;
}
