'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Lock, Loader2, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        // Check if user has a valid session (from reset email)
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setError('Link non valido o scaduto. Richiedi un nuovo link di reset.');
                }
            } catch {
                setError('Errore di connessione. Verifica la tua rete e riprova.');
            }
        };
        checkSession();
    }, [supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validate passwords
        if (password.length < 8) {
            setError('La password deve essere di almeno 8 caratteri');
            return;
        }

        if (password !== confirmPassword) {
            setError('Le password non corrispondono');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) throw error;

            setSuccess(true);

            // Redirect to home after 2 seconds
            setTimeout(() => {
                router.push('/');
            }, 2000);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Si è verificato un errore';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center px-4">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mb-4">
                        <Check className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Password Aggiornata!</h1>
                    <p className="text-gray-400">Reindirizzamento in corso...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <Sparkles className="w-10 h-10 text-purple-400" />
                        <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                            Goalify
                        </span>
                    </div>
                    <p className="text-gray-500">Imposta una Nuova Password</p>
                </div>

                {/* Form Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* New Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm text-gray-400 mb-2">
                                Nuova Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    required
                                    minLength={8}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                />
                            </div>
                            {password.length > 0 && password.length < 8 && (
                                <p className="text-xs text-amber-400 mt-1">Minimo 8 caratteri richiesti</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm text-gray-400 mb-2">
                                Conferma Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    required
                                    minLength={8}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                />
                            </div>
                            {confirmPassword.length > 0 && password !== confirmPassword && (
                                <p className="text-xs text-amber-400 mt-1">Le password non corrispondono</p>
                            )}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div role="alert" className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || password !== confirmPassword || password.length < 8}
                            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Aggiornamento...
                                </>
                            ) : (
                                'Aggiorna Password'
                            )}
                        </button>
                    </form>

                    {/* Back to Login */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => router.push('/login')}
                            className="text-gray-500 hover:text-white transition-colors text-sm"
                        >
                            <span className="text-purple-400">← Torna al login</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
