'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdminQuery } from '@/hooks/use-admin-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
import { ImageUploadField } from '@/components/image-upload-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, Challenge } from '@/lib/api';
import { adminDrawerWidthClass } from '@/lib/layout';
import { mn, challengeKindLabels } from '@/lib/mn';

const emptyForm = {
  name: '',
  kind: 'daily',
  description: '',
  imageUrl: '',
  rewardText: '',
  durationDays: 21,
  weeklyGoalDays: 5,
  timeLimitSeconds: '',
  startDate: '',
  endDate: '',
  isActive: true,
};

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Challenge | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data } = useAdminQuery(() => api.getChallenges(), [refreshKey]);

  useEffect(() => {
    if (data?.challenges) setChallenges(data.challenges);
  }, [data]);

  const load = useCallback(() => setRefreshKey((k) => k + 1), []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c: Challenge) => {
    setEditing(c);
    setForm({
      name: c.name,
      kind: c.kind || 'daily',
      description: c.description || '',
      imageUrl: c.imageUrl || '',
      rewardText: c.rewardText || '',
      durationDays: c.durationDays,
      weeklyGoalDays: c.weeklyGoalDays,
      timeLimitSeconds: c.timeLimitSeconds ? String(c.timeLimitSeconds) : '',
      startDate: c.startDate || '',
      endDate: c.endDate || '',
      isActive: c.isActive,
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        durationDays: Number(form.durationDays),
        weeklyGoalDays: Number(form.weeklyGoalDays),
        timeLimitSeconds: form.timeLimitSeconds ? Number(form.timeLimitSeconds) : null,
        imageUrl: form.imageUrl || null,
        rewardText: form.rewardText || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };

      if (editing) {
        await api.updateChallenge(editing.id, payload);
      } else {
        await api.createChallenge(payload);
      }
      setOpen(false);
      load();
    } catch (error) {
      alert(error instanceof Error ? error.message : mn.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(mn.deleteChallenge)) return;
    await api.deleteChallenge(id);
    load();
  };

  return (
    <AdminShell title={mn.challenges}>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> {mn.addChallenge}
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className={`flex h-full w-full flex-col gap-0 overflow-hidden p-0 ${adminDrawerWidthClass}`}
        >
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{editing ? mn.editChallenge : mn.newChallenge}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid gap-4">
              <ImageUploadField
                label={mn.challengeImage}
                hint={mn.challengeImageHint}
                value={form.imageUrl}
                onChange={(imageUrl) => setForm({ ...form, imageUrl })}
                folder="sunialt/challenges"
                showUrlInput={false}
              />
              <div className="space-y-2">
                <Label>{mn.name}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{mn.type}</Label>
                <Select value={form.kind} onValueChange={(v) => v && setForm({ ...form, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(challengeKindLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{mn.description}</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{mn.rewardText}</Label>
                <Input value={form.rewardText} onChange={(e) => setForm({ ...form, rewardText: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{mn.durationDays}</Label>
                  <Input type="number" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>{mn.weeklyGoalDays}</Label>
                  <Input type="number" value={form.weeklyGoalDays} onChange={(e) => setForm({ ...form, weeklyGoalDays: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{mn.timeLimit}</Label>
                <Input type="number" value={form.timeLimitSeconds} onChange={(e) => setForm({ ...form, timeLimitSeconds: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Эхлэх огноо</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Дуусах огноо</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                <Label>{mn.active}</Label>
              </div>
            </div>
          </div>

          <SheetFooter className="border-t px-6 py-4">
            <Button className="w-full" onClick={save} disabled={saving}>
              {saving ? mn.saving : editing ? mn.update : mn.create}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <div className="rounded-lg border">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[38%] whitespace-normal">{mn.name}</TableHead>
              <TableHead>{mn.type}</TableHead>
              <TableHead>{mn.durationDays}</TableHead>
              <TableHead>{mn.weeklyGoalDays}</TableHead>
              <TableHead>{mn.status}</TableHead>
              <TableHead className="text-right">{mn.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {challenges.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="whitespace-normal align-top">
                  <div className="flex min-w-0 items-start gap-3">
                    {c.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.imageUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-md bg-muted" />
                    )}
                    <div className="min-w-0">
                      <div className="break-words font-medium">{c.name}</div>
                      <div className="break-words text-xs text-muted-foreground line-clamp-2">{c.description}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{challengeKindLabels[c.kind || 'daily'] || c.kind}</TableCell>
                <TableCell>{c.durationDays} {mn.days}</TableCell>
                <TableCell>{c.weeklyGoalDays} {mn.daysPerWeek}</TableCell>
                <TableCell>
                  <Badge variant={c.isActive ? 'default' : 'secondary'}>
                    {c.isActive ? mn.active : mn.inactive}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminShell>
  );
}
