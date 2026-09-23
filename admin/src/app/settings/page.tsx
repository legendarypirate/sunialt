'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { useAdminQuery } from '@/hooks/use-admin-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api, PaymentSettings } from '@/lib/api';
import { mn } from '@/lib/mn';

const empty: PaymentSettings = {
  qpayEnabled: true,
  qpayConfigured: false,
  qpayClientId: '',
  qpayClientSecret: '',
  qpayInvoiceCode: '',
  qpayReceiverCode: 'DEFAULT_COM_ID',
  qpayBaseUrl: 'https://merchant.qpay.mn/v2',
  qpayCallbackUrl: '',
};

export default function SettingsPage() {
  const { data } = useAdminQuery(() => api.getSettings());
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.settings) setForm(data.settings);
  }, [data]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { settings } = await api.updateSettings(form);
      setForm(settings);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell title={mn.settings}>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{mn.qpay}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">{mn.qpayEnabled}</div>
              <p className="text-sm text-muted-foreground">{mn.qpayHint}</p>
              <p className={`text-sm mt-1 ${form.qpayConfigured ? 'text-green-600' : 'text-amber-600'}`}>
                {form.qpayConfigured ? mn.qpayConfigured : mn.qpayNotConfigured}
              </p>
            </div>
            <Switch
              checked={form.qpayEnabled}
              onCheckedChange={(value) => setForm({ ...form, qpayEnabled: value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{mn.qpayClientId}</Label>
            <Input value={form.qpayClientId} onChange={(e) => setForm({ ...form, qpayClientId: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{mn.qpayClientSecret}</Label>
            <Input type="password" value={form.qpayClientSecret} onChange={(e) => setForm({ ...form, qpayClientSecret: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{mn.qpayInvoiceCode}</Label>
            <Input value={form.qpayInvoiceCode} onChange={(e) => setForm({ ...form, qpayInvoiceCode: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{mn.qpayReceiverCode}</Label>
            <Input value={form.qpayReceiverCode} onChange={(e) => setForm({ ...form, qpayReceiverCode: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{mn.qpayBaseUrl}</Label>
            <Input value={form.qpayBaseUrl} onChange={(e) => setForm({ ...form, qpayBaseUrl: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{mn.qpayCallbackUrl}</Label>
            <Input value={form.qpayCallbackUrl} onChange={(e) => setForm({ ...form, qpayCallbackUrl: e.target.value })} />
          </div>
          <Button onClick={save} disabled={saving}>{mn.save}</Button>
          {saved && <p className="text-sm text-green-600">{mn.saved}</p>}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
