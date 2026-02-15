'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, Calendar, ListTodo, History, Sparkles, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    // Don't show header on login, auth, and reset-password pages
    if (pathname === '/login' || pathname.startsWith('/auth/') || pathname === '/reset-password') {
        return null;
    }

    const handleLogout = async () => {
        try {
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
            router.push('/login');
        }
    };

    const menuItems = [
        { href: '/calendar', icon: Calendar, label: 'Calendario' },
        { href: '/tasks', icon: ListTodo, label: 'Elenco Task' },
        { href: '/history', icon: History, label: 'Storico' },
    ];

    return (
        <>
        <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
            <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link
                    href="/"
                    className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity"
                >
                    <Sparkles className="w-6 h-6 text-purple-400" />
                    <span className="text-lg font-semibold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                        Goalify
                    </span>
                </Link>

                {/* Menu Button */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-2 rounded-xl hover:bg-white/5 transition-colors"
                        aria-label={isOpen ? 'Chiudi menu' : 'Apri menu'}
                        aria-expanded={isOpen}
                        aria-haspopup="true"
                    >
                        {isOpen ? (
                            <X className="w-6 h-6 text-gray-300" />
                        ) : (
                            <Menu className="w-6 h-6 text-gray-300" />
                        )}
                    </button>

                    {/* Dropdown */}
                    {isOpen && (
                        <div
                            role="menu"
                            className="absolute right-0 mt-2 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-xl overflow-hidden"
                        >
                            {menuItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    role="menuitem"
                                    className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span>{item.label}</span>
                                </Link>
                            ))}

                            {/* Divider */}
                            <div className="border-t border-white/10" />

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                role="menuitem"
                                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 transition-colors"
                                aria-label="Disconnettiti"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Esci</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
        <div className="h-16" />
        </>
    );
}
