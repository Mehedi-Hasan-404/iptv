'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/admin');
    } catch (err) {
      setError("Login failed. Check credentials.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className="form-input" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className="form-input" />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="submit" className="w-full play-btn">Sign in</button>
    </form>
  );
}
