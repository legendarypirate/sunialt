'use client';

import { Users, Dumbbell, Trophy, ShoppingBag, Crown, Activity, ClipboardList } from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminQuery } from '@/hooks/use-admin-query';
import { api } from '@/lib/api';
import { mn } from '@/lib/mn';

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, loading, error } = useAdminQuery(() => api.getDashboard());

  return (
    <AdminShell title={mn.dashboard}>
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : error ? (
        <p className="text-muted-foreground">{mn.loadDashboardFailed}</p>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title={mn.totalUsers}
              value={data.stats.totalUsers}
              icon={Users}
              subtitle={`${data.stats.activeUsers} ${mn.activeUsers}`}
            />
            <StatCard
              title="SUNIA Plus"
              value={data.stats.plusSubscribers}
              icon={Crown}
              subtitle={mn.subscribers}
            />
            <StatCard
              title={mn.exercises}
              value={data.stats.totalExercises || 0}
              icon={ClipboardList}
              subtitle={mn.publishedExercises}
            />
            <StatCard
              title={mn.workouts}
              value={data.stats.totalWorkouts}
              icon={Dumbbell}
              subtitle={mn.publishedPrograms}
            />
            <StatCard
              title={mn.sessions}
              value={data.stats.totalSessions || 0}
              icon={Activity}
              subtitle={`${data.stats.totalReps || 0} ${mn.reps}`}
            />
            <StatCard
              title={mn.challenges}
              value={data.stats.activeChallenges}
              icon={Trophy}
              subtitle={mn.activeChallenges}
            />
            <StatCard
              title={mn.products}
              value={data.stats.totalProducts}
              icon={ShoppingBag}
              subtitle={mn.inShop}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{mn.recentUsers}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">{mn.noUsersYet}</p>
              ) : (
                <div className="space-y-3">
                  {data.recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{user.displayName || mn.unknown}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{user.streakDays} {mn.dayStreak}</Badge>
                        {user.isPlusSubscriber && <Badge>SUNIA Plus</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </AdminShell>
  );
}
