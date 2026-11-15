'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBase } from '@/app/api/client';

export default function BusyPage() {
  const router = useRouter();
  useEffect(() => {
    const base = getApiBase();
    fetch(`${base}/generate-busy-session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(r => r.json())
      .then(data => {
        if (data.room_id) router.replace(`/call/${data.room_id}?mode=inbound&busy=true`);
        else router.replace('/dashboard');
      })
      .catch(() => router.replace('/dashboard'));
  }, [router]);

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#faf8ff]">
      <div className="text-center space-y-4 p-8">
        <div className="w-20 h-20 mx-auto rounded-full bg-primary-container flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-white text-4xl">phone_in_talk</span>
        </div>
        <h1 className="text-2xl font-extrabold text-[#131b2e]">Connecting to Vaani AI...</h1>
        <p className="text-sm text-[#464555]">Your AI assistant is ready to screen your call.</p>
        <div className="flex justify-center gap-1 pt-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-primary-container animate-bounce" style={{animationDelay:`${i*150}ms`}} />
          ))}
        </div>
      </div>
    </div>
  );
}