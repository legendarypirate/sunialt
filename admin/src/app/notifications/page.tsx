'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  api,
  PushNotificationAudience,
  PushNotificationStats,
  SendPushNotificationResult,
} from '@/lib/api';
import { AdminShell } from '@/components/admin-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mn } from '@/lib/mn';

const audienceOptions: { value: PushNotificationAudience; label: string }[] = [
  { value: 'all', label: 'Бүх хэрэглэгч' },
  { value: 'free', label: 'Зөвхөн Free' },
  { value: 'pro', label: 'Premium / Pro' },
];

function audienceLabel(audience: PushNotificationAudience) {
  return audienceOptions.find((option) => option.value === audience)?.label || audience;
}

export default function NotificationsPage() {
  const [stats, setStats] = useState<PushNotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('Suniagch');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<PushNotificationAudience>('all');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendPushNotificationResult | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const audiencePreview = useMemo(() => {
    if (stats?.audienceCounts) {
      return stats.audienceCounts[audience] || { users: 0, devices: 0 };
    }
    return { users: 0, devices: 0 };
  }, [stats, audience]);

  async function loadStats() {
    setLoading(true);
    try {
      const data = await api.getNotificationStats();
      setStats(data.stats);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : mn.saveFailed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) {
      setError('Гарчиг болон мессеж оруулна уу');
      return;
    }

    const recipientText =
      audience === 'all'
        ? 'бүх бүртгэлтэй хэрэглэгчид'
        : `${audienceLabel(audience)} хэрэглэгчид`;

    if (!confirm(`${recipientText} push мэдэгдэл илгээх үү?`)) {
      return;
    }

    setSending(true);
    setError('');
    setSuccessMessage('');
    setResult(null);

    try {
      const data = await api.sendNotification({
        title: trimmedTitle,
        body: trimmedBody,
        audience,
        data: { type: 'admin_broadcast' },
      });
      setResult(data);
      setSuccessMessage(data.message || `${data.sent} төхөөрөмжид илгээлээ`);
      setBody('');
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Илгээхэд алдаа гарлаа');
    } finally {
      setSending(false);
    }
  }

  return (
    <AdminShell title={mn.notifications}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">FCM тохиргоо</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${stats?.fcmConfigured ? 'text-green-600' : 'text-amber-600'}`}>
              {stats?.fcmConfigured ? 'Бэлэн' : 'Байхгүй'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Бүртгэлтэй төхөөрөмж</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.registeredDevices ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Хэрэглэгч (token-той)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.usersWithTokens ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">iOS / Android</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats ? `${stats.iosDevices} / ${stats.androidDevices}` : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {!stats?.fcmConfigured && !loading && (
        <Card className="mt-4 border-amber-300 bg-amber-50">
          <CardContent className="pt-6 text-sm">
            <p className="font-medium">FCM ажиллахгүй байна</p>
            {stats?.fcmInitError && (
              <p className="mt-2 break-all font-mono text-xs">{stats.fcmInitError}</p>
            )}
            <p className="mt-2 text-muted-foreground">
              Backend <code>FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json</code> тохируулна уу.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4 max-w-2xl">
        <CardHeader>
          <CardTitle>Push илгээх</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-2">
              <Label>Хүлээн авагч</Label>
              <Select value={audience} onValueChange={(value) => setAudience(value as PushNotificationAudience)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {audienceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Ойролцоогоор {audiencePreview.users} хэрэглэгч, {audiencePreview.devices} төхөөрөмж
              </p>
            </div>
            <div className="space-y-2">
              <Label>Гарчиг</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Мессеж</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}
            {result && result.failed > 0 && (
              <p className="text-sm text-amber-600">
                {result.sent} амжилттай, {result.failed} алдаатай
              </p>
            )}
            <Button
              type="submit"
              disabled={sending || loading || !stats?.fcmConfigured || audiencePreview.devices === 0}
            >
              {sending ? 'Илгээж байна...' : 'Push илгээх'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {stats && stats.devices.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Сүүлийн бүртгэлтэй төхөөрөмжүүд</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Хэрэглэгч</th>
                  <th className="pb-2 pr-4">Platform</th>
                  <th className="pb-2 pr-4">Token</th>
                  <th className="pb-2">Шинэчлэгдсэн</th>
                </tr>
              </thead>
              <tbody>
                {stats.devices.slice(0, 20).map((device) => (
                  <tr key={`${device.userId}-${device.tokenSuffix}`} className="border-b">
                    <td className="py-2 pr-4">{device.userName || device.userEmail || device.userId}</td>
                    <td className="py-2 pr-4">{device.platform}</td>
                    <td className="py-2 pr-4 font-mono">...{device.tokenSuffix}</td>
                    <td className="py-2">{new Date(device.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </AdminShell>
  );
}
