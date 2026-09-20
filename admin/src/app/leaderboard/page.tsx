'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { useAdminQuery } from '@/hooks/use-admin-query';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { mn } from '@/lib/mn';

export default function LeaderboardPage() {
  const [period, setPeriod] = useState('daily');
  const { data, loading } = useAdminQuery(() => api.getLeaderboard(period), [period]);
  const rows = data?.leaderboard || [];

  return (
    <AdminShell title={mn.leaderboard}>
      <div className="mb-4 flex gap-2">
        <Button variant={period === 'daily' ? 'default' : 'secondary'} onClick={() => setPeriod('daily')}>{mn.daily}</Button>
        <Button variant={period === 'weekly' ? 'default' : 'secondary'} onClick={() => setPeriod('weekly')}>{mn.weekly}</Button>
        <Button variant={period === 'all' ? 'default' : 'secondary'} onClick={() => setPeriod('all')}>{mn.allTime}</Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>{mn.user}</TableHead>
              <TableHead>{mn.score}</TableHead>
              <TableHead>{mn.sessions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">{mn.loading}</TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">{mn.noLeaderboard}</TableCell>
              </TableRow>
            ) : rows.map((row) => (
              <TableRow key={`${row.userId}-${row.rank}`}>
                <TableCell className="font-bold">{row.rank}</TableCell>
                <TableCell>
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-muted-foreground">{row.email}</div>
                </TableCell>
                <TableCell>{row.score}</TableCell>
                <TableCell>{row.sessions}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminShell>
  );
}
