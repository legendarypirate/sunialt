'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  api,
  PushNotificationAudience,
  PushNotificationStats,
  PushRecipient,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { mn } from '@/lib/mn';

const POLL_INTERVAL_MS = 2000;
const SEARCH_DEBOUNCE_MS = 300;

const audienceOptions: { value: PushNotificationAudience; label: string }[] = [
  { value: 'all', label: 'Бүх хэрэглэгч' },
  { value: 'free', label: 'Зөвхөн Free' },
  { value: 'pro', label: 'Premium / Pro' },
  { value: 'selected', label: 'Сонгосон хэрэглэгчид' },
];

function audienceLabel(audience: PushNotificationAudience) {
  return audienceOptions.find((option) => option.value === audience)?.label || audience;
}

function recipientName(user: PushRecipient) {
  return user.displayName?.trim() || user.email;
}

interface RecipientPickerProps {
  selected: Map<string, PushRecipient>;
  onChange: (next: Map<string, PushRecipient>) => void;
  disabled?: boolean;
}

function RecipientPicker({ selected, onChange, disabled }: RecipientPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PushRecipient[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.searchNotificationRecipients(query.trim());
        if (!cancelled) {
          setResults(data.users);
          setSearchError('');
        }
      } catch (err) {
        if (!cancelled) {
          setSearchError(err instanceof Error ? err.message : 'Хайлт амжилтгүй');
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  function toggle(user: PushRecipient) {
    const next = new Map(selected);
    if (next.has(user.id)) {
      next.delete(user.id);
    } else {
      next.set(user.id, user);
    }
    onChange(next);
  }

  const selectedList = [...selected.values()];

  return (
    <div className="space-y-3 rounded-md border p-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={mn.searchPlaceholder}
        disabled={disabled}
      />

      <div className="max-h-64 overflow-y-auto rounded-md border">
        {searchError && <p className="p-3 text-sm text-red-600">{searchError}</p>}
        {!searchError && results.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">
            {searching ? 'Хайж байна...' : 'Хэрэглэгч олдсонгүй'}
          </p>
        )}
        {results.map((user) => {
          const checked = selected.has(user.id);
          return (
            <label
              key={user.id}
              className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-muted/50"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={checked}
                onChange={() => toggle(user)}
                disabled={disabled}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{recipientName(user)}</span>
                <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {user.isPlusSubscriber ? 'Pro' : 'Free'} ·{' '}
                {user.deviceCount > 0 ? `${user.deviceCount} төхөөрөмж` : 'төхөөрөмжгүй'}
              </span>
            </label>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Сонгосон: {selectedList.length}</span>
        {selectedList.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(new Map())}
            disabled={disabled}
          >
            Бүгдийг арилгах
          </Button>
        )}
      </div>

      {selectedList.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedList.map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-xs"
              title={user.email}
            >
              {recipientName(user)}
              {user.deviceCount === 0 && <span className="text-amber-600">(төхөөрөмжгүй)</span>}
              <button
                type="button"
                className="ml-1 text-muted-foreground hover:text-foreground"
                onClick={() => toggle(user)}
                disabled={disabled}
                aria-label="Хасах"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const [stats, setStats] = useState<PushNotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('Suniagch');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<PushNotificationAudience>('all');
  const [selectedUsers, setSelectedUsers] = useState<Map<string, PushRecipient>>(new Map());
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendPushNotificationResult | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const audiencePreview = useMemo(() => {
    if (audience === 'selected') {
      let devices = 0;
      for (const user of selectedUsers.values()) devices += user.deviceCount;
      return { users: selectedUsers.size, devices };
    }
    if (stats?.audienceCounts) {
      return stats.audienceCounts[audience] || { users: 0, devices: 0 };
    }
    return { users: 0, devices: 0 };
  }, [stats, audience, selectedUsers]);

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

    const userIds = audience === 'selected' ? [...selectedUsers.keys()] : undefined;
    if (audience === 'selected' && !userIds?.length) {
      setError('Хамгийн багадаа нэг хэрэглэгч сонгоно уу');
      return;
    }

    const recipientText =
      audience === 'all'
        ? 'бүх бүртгэлтэй хэрэглэгчид'
        : audience === 'selected'
          ? `сонгосон ${userIds?.length} хэрэглэгчид`
          : `${audienceLabel(audience)} хэрэглэгчид`;

    if (!confirm(`${recipientText} push мэдэгдэл илгээх үү?`)) {
      return;
    }

    setSending(true);
    setError('');
    setSuccessMessage('');
    setResult(null);

    try {
      let data = await api.sendNotification({
        title: trimmedTitle,
        body: trimmedBody,
        audience,
        userIds,
        data: { type: 'admin_broadcast' },
      });
      setResult(data);

      // Large audiences keep sending on the server; poll until finished.
      while (data.status === 'running') {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        data = await api.getNotificationJob(data.jobId);
        setResult(data);
      }

      if (data.status === 'failed') {
        setError(data.error || data.message || 'Илгээхэд алдаа гарлаа');
      } else {
        setSuccessMessage(data.message || `${data.sent} төхөөрөмжид илгээлээ`);
        setBody('');
      }
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Илгээхэд алдаа гарлаа');
    } finally {
      setSending(false);
    }
  }

  const progressText =
    sending && result?.status === 'running'
      ? `Илгээж байна... ${result.processedTokens} / ${result.tokenCount} төхөөрөмж`
      : null;

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
                {audience === 'selected' ? 'Сонгосон' : 'Ойролцоогоор'} {audiencePreview.users} хэрэглэгч,{' '}
                {audiencePreview.devices} төхөөрөмж
              </p>
            </div>
            {audience === 'selected' && (
              <div className="space-y-2">
                <Label>Хэрэглэгч сонгох</Label>
                <RecipientPicker
                  selected={selectedUsers}
                  onChange={setSelectedUsers}
                  disabled={sending}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Гарчиг</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Мессеж</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {progressText && <p className="text-sm text-muted-foreground">{progressText}</p>}
            {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}
            {result && result.status !== 'running' && result.failed > 0 && (
              <p className="text-sm text-amber-600">
                {result.sent} амжилттай, {result.failed} алдаатай
              </p>
            )}
            {result &&
              result.status !== 'running' &&
              result.requestedUsers > result.recipientCount && (
                <p className="text-sm text-amber-600">
                  {result.requestedUsers - result.recipientCount} хэрэглэгч бүртгэлтэй төхөөрөмжгүй тул
                  илгээгдсэнгүй
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Хэрэглэгч</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Шинэчлэгдсэн</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.devices.slice(0, 20).map((device) => (
                  <TableRow key={`${device.userId}-${device.tokenSuffix}`}>
                    <TableCell>{device.userName || device.userEmail || device.userId}</TableCell>
                    <TableCell>{device.platform}</TableCell>
                    <TableCell className="font-mono">...{device.tokenSuffix}</TableCell>
                    <TableCell>{new Date(device.updatedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </AdminShell>
  );
}
