'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SprintVelocity } from '@/lib/db/types';
import { BurndownChart } from './BurndownChart';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
const API_KEY = process.env.NEXT_PUBLIC_DASHBOARD_API_KEY || '';

function authHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (API_KEY) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }
  return headers;
}

interface VelocityWidgetProps {
  sprintId: string;
  sprintName: string;
}

export function VelocityWidget({ sprintId, sprintName }: VelocityWidgetProps) {
  const [velocity, setVelocity] = useState<SprintVelocity | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchVelocity = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sprints/${sprintId}/velocity`, { headers: authHeaders() });
      if (!res.ok) {
        throw new Error('Failed to fetch sprint velocity');
      }

      const data = await res.json();
      setVelocity(data.velocity ?? null);
    } catch (error) {
      console.error('Velocity fetch error:', error);
      setVelocity(null);
    } finally {
      setLoading(false);
    }
  }, [sprintId]);

  useEffect(() => {
    setLoading(true);
    fetchVelocity();

    const interval = setInterval(fetchVelocity, 3000);
    return () => clearInterval(interval);
  }, [fetchVelocity]);

  if (loading) {
    return <div className="h-44 rounded-lg animate-skeleton" />;
  }

  if (!velocity) {
    return (
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
          Sprint Velocity
        </h3>
        <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
          Unable to load velocity for {sprintName}
        </p>
      </div>
    );
  }

  const progress = velocity.total_points > 0 ? Math.round((velocity.completed_points / velocity.total_points) * 100) : 0;

  return (
    <div className="mb-4 rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
          {velocity.sprint_name}
        </h3>
        <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
          {progress}% complete
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--bg-hover)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(progress, 100)}%`, background: 'var(--accent)' }}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md py-2" style={{ background: 'var(--card)' }}>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Total
          </div>
          <div className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
            {velocity.total_points}
          </div>
        </div>
        <div className="rounded-md py-2" style={{ background: 'var(--card)' }}>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Done
          </div>
          <div className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
            {velocity.completed_points}
          </div>
        </div>
        <div className="rounded-md py-2" style={{ background: 'var(--card)' }}>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Left
          </div>
          <div className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
            {Math.max(velocity.total_points - velocity.completed_points, 0)}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <BurndownChart data={velocity.daily_progress} totalPoints={velocity.total_points} />
      </div>

      <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
        🔴 High (5pts) 🟡 Med (3pts) 🟢 Low (1pt)
      </p>
    </div>
  );
}
