"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Input, Button } from "@/components/ui";
import { TrendingUp } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, name);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(28,34,48,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(28,34,48,0.4)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-accent" />
            <span className="text-lg font-semibold tracking-[0.3em] text-terminal-bright uppercase">Tradelog</span>
          </div>
          <div className="text-xs text-terminal-dim tracking-widest uppercase">Create Account</div>
        </div>

        <div className="bg-terminal-surface border border-terminal-border rounded-sm p-6">
          <div className="text-[10px] text-terminal-dim tracking-widest uppercase mb-5 pb-3 border-b border-terminal-border">
            — New Account Registration —
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] text-terminal-dim tracking-widest uppercase mb-1.5">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label className="block text-[10px] text-terminal-dim tracking-widest uppercase mb-1.5">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="trader@example.com" required autoFocus />
            </div>
            <div>
              <label className="block text-[10px] text-terminal-dim tracking-widest uppercase mb-1.5">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" required />
            </div>

            {error && (
              <div className="text-xs text-loss bg-loss/5 border border-loss/20 rounded-sm px-3 py-2">{error}</div>
            )}

            <Button type="submit" className="w-full justify-center py-2.5" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-terminal-border text-center">
            <span className="text-xs text-terminal-dim">Have an account? </span>
            <Link href="/login" className="text-xs text-accent hover:text-accent-bright transition-colors">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
