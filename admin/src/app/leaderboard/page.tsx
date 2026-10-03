'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { AdminTableCard, AdminTableToolbar } from '@/components/admin-table-controls';
import { useAdminQuery } from '@/hooks/use-admin-query';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
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
  const [view, setView] = useState<'overall' | 'challenge'>('overall');
  const [period, setPeriod] = useState('daily');
  const [challengeId, setChallengeId] = useState('');
  const { data, loading } = useAdminQuery(
    () => api.getLeaderboard(period),
    [period]
  );
  const { data: challengesData, loading: challengesLoading } = useAdminQuery(
    () => api.getChallenges()
  );
  const challenges = challengesData?.challenges || [];
  const selectedChallengeId = challengeId || challenges[0]?.id || '';
  const { data: challengeData, loading: challengeLoading } = useAdminQuery(
    () => selectedChallengeId
      ? api.getChallengeLeaderboard(selectedChallengeId)
      : Promise.resolve({ challenge: null, leaderboard: [] }),
    [selectedChallengeId]
  );
  const rows = data?.leaderboard || [];
  const challengeRows = challengeData?.leaderboard || [];
  const tableLoading = view === 'overall'
    ? loading
    : challengesLoading || challengeLoading;

  return (
    <AdminShell title={mn.leaderboard}>
      <AdminTableToolbar>
        <Button
          size="sm"
          variant={view === 'overall' ? 'default' : 'secondary'}
          onClick={() => setView('overall')}
        >
          {mn.overallLeaderboard}
        </Button>
        <Button
          size="sm"
          variant={view === 'challenge' ? 'default' : 'secondary'}
          onClick={() => setView('challenge')}
        >
          {mn.challengeLeaderboard}
        </Button>

        <div className="mx-1 h-6 w-px bg-border" />

        {view === 'overall' ? (
          <>
            <Button size="sm" variant={period === 'daily' ? 'default' : 'secondary'} onClick={() => setPeriod('daily')}>{mn.daily}</Button>
            <Button size="sm" variant={period === 'weekly' ? 'default' : 'secondary'} onClick={() => setPeriod('weekly')}>{mn.weekly}</Button>
            <Button size="sm" variant={period === 'all' ? 'default' : 'secondary'} onClick={() => setPeriod('all')}>{mn.allTime}</Button>
          </>
        ) : (
          <Select
            value={selectedChallengeId}
            onValueChange={(value) => setChallengeId(value || '')}
            disabled={challenges.length === 0}
          >
            <SelectTrigger className="h-8 min-w-56">
              <span className="min-w-0 flex-1 truncate text-left">
                {challenges.find((challenge) => challenge.id === selectedChallengeId)?.name
                  || mn.selectChallenge}
              </span>
            </SelectTrigger>
            <SelectContent>
              {challenges.map((challenge) => (
                <SelectItem key={challenge.id} value={challenge.id}>
                  {challenge.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </AdminTableToolbar>
      <AdminTableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>{mn.user}</TableHead>
              <TableHead>{mn.score}</TableHead>
              <TableHead>
                {view === 'overall' ? mn.sessions : mn.completedAt}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">{mn.loading}</TableCell>
              </TableRow>
            ) : (view === 'overall' ? rows : challengeRows).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">{mn.noLeaderboard}</TableCell>
              </TableRow>
            ) : view === 'overall' ? (
              rows.map((row) => (
                <TableRow key={`${row.userId}-${row.rank}`}>
                  <TableCell className="font-bold">{row.rank}</TableCell>
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.email}</div>
                  </TableCell>
                  <TableCell>{row.score}</TableCell>
                  <TableCell>{row.sessions}</TableCell>
                </TableRow>
              ))
            ) : (
              challengeRows.map((row) => (
                <TableRow key={`${row.userId}-${row.rank}`}>
                  <TableCell className="font-bold">{row.rank}</TableCell>
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.email}</div>
                  </TableCell>
                  <TableCell>{row.score}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(row.completedAt).toLocaleString('mn-MN')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </AdminTableCard>
    </AdminShell>
  );
}
