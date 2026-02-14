'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Mail, Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);

    const supabase = createClient();

    // Handle cooldown countdown
    useEffect(() => {
        if (!cooldownUntil) return;

        const interval = setInterval(() => {
            if (Date.now() >= cooldownUntil) {
                setCooldownUntil(null);
                setFailedAttempts(0);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [cooldownUntil]);

    const getRemainingCooldown = () => {
        if (!cooldownUntil) return 0;
        return Math.ceil((cooldownUntil - Date.now()) / 1000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check cooldown
        if (cooldownUntil && Date.now() < cooldownUntil) {
            return;
        }

        // Validate password strength on signup
        if (!isLogin && password.length < 8) {
            setError('La password deve essere di almeno 8 caratteri');
            return;
        }

        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                window.location.href = '/';
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                });
                if (error) throw error;
                setMessage('Controlla la tua email per confermare la registrazione!');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Si è verificato un errore';
            setError(errorMessage);

            // Implement exponential backoff
            if (isLogin) {
                const newAttempts = failedAttempts + 1;
                setFailedAttempts(newAttempts);

                if (newAttempts >= 3) {
                    const cooldownSeconds = Math.min(3 * Math.pow(2, newAttempts - 3), 300); // Max 5 minutes
                    setCooldownUntil(Date.now() + cooldownSeconds * 1000);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const remainingCooldown = getRemainingCooldown();
    const isInCooldown = remainingCooldown > 0;

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
                    <p className="text-gray-500">
                        {isLogin ? 'Accedi al Tuo Account' : 'Crea un Nuovo Account'}
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm text-gray-400 mb-2">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu@email.com"
                                    autoComplete="email"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm text-gray-400 mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                                    required
                                    minLength={8}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                />
                            </div>
                            {!isLogin && password.length > 0 && password.length < 8 && (
                                <p className="text-xs text-amber-400 mt-1">Minimo 8 caratteri richiesti</p>
                            )}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div role="alert" className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Success Message */}
                        {message && (
                            <div role="status" className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
                                {message}
                            </div>
                        )}

                        {/* Cooldown Warning */}
                        {isInCooldown && (
                            <div role="alert" className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm">
                                Troppi tentativi falliti. Riprova tra {remainingCooldown} secondi.
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || isInCooldown}
                            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : isInCooldown ? (
                                `Attendi ${remainingCooldown}s`
                            ) : isLogin ? (
                                'Accedi'
                            ) : (
                                'Registrati'
                            )}
                        </button>
                    </form>

                    {/* Toggle */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError(null);
                                setMessage(null);
                            }}
                            className="text-gray-500 hover:text-white transition-colors text-sm"
                        >
                            {isLogin ? (
                                <>Non hai un account? <span className="text-purple-400">Registrati</span></>
                            ) : (
                                <>Hai già un account? <span className="text-purple-400">Accedi</span></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
