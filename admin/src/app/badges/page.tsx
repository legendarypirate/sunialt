'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
import { useAdminQuery } from '@/hooks/use-admin-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ImageUploadField } from '@/components/image-upload-field';
import { api, Badge as BadgeItem } from '@/lib/api';
import { mn } from '@/lib/mn';

const emptyForm = {
  key: '',
  title: '',
  subtitle: '',
  icon: 'emoji_events',
  imageUrl: '',
  sortOrder: 0,
  isPublished: true,
};

export default function BadgesPage() {
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BadgeItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [refreshKey, setRefreshKey] = useState(0);
  const { data } = useAdminQuery(() => api.getBadges(), [refreshKey]);

  useEffect(() => {
    if (data?.badges) setBadges(data.badges);
  }, [data]);

  const load = useCallback(() => setRefreshKey((k) => k + 1), []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (badge: BadgeItem) => {
    setEditing(badge);
    setForm({
      key: badge.key,
      title: badge.title,
      subtitle: badge.subtitle || '',
      icon: badge.icon,
      imageUrl: badge.imageUrl || '',
      sortOrder: badge.sortOrder,
      isPublished: badge.isPublished,
    });
    setOpen(true);
  };

  const save = async () => {
    const payload = {
      ...form,
      sortOrder: Number(form.sortOrder),
      imageUrl: form.imageUrl.trim() || null,
    };
    if (editing) await api.updateBadge(editing.id, payload);
    else await api.createBadge(payload);
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(mn.deleteBadge)) return;
    await api.deleteBadge(id);
    load();
  };

  return (
    <AdminShell title={mn.badges}>
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => { openCreate(); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> {mn.addBadge}
          </Button>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? mn.editBadge : mn.newBadge}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>{mn.key}</Label>
                <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{mn.title}</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{mn.subtitle}</Label>
                <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
              </div>
              <ImageUploadField
                label={mn.badgeImage}
                hint={mn.badgeImageHint}
                value={form.imageUrl}
                onChange={(imageUrl) => setForm({ ...form, imageUrl })}
                folder="sunialt/badges"
              />
              <div className="space-y-2">
                <Label>{mn.icon}</Label>
                <Input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="emoji_events"
                />
                <p className="text-xs text-muted-foreground">
                  Зураг байхгүй үед Material icon нэр ашиглана.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} />
                <Label>{mn.publish}</Label>
              </div>
              <Button onClick={save}>{editing ? mn.update : mn.create}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{mn.title}</TableHead>
              <TableHead>{mn.key}</TableHead>
              <TableHead>{mn.badgeImage}</TableHead>
              <TableHead>{mn.status}</TableHead>
              <TableHead className="text-right">{mn.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {badges.map((badge) => (
              <TableRow key={badge.id}>
                <TableCell>
                  <div className="font-medium">{badge.title}</div>
                  <div className="text-xs text-muted-foreground">{badge.subtitle}</div>
                </TableCell>
                <TableCell>{badge.key}</TableCell>
                <TableCell>
                  {badge.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={badge.imageUrl}
                      alt=""
                      className="h-12 w-12 rounded-lg border object-cover"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={badge.isPublished ? 'default' : 'secondary'}>
                    {badge.isPublished ? mn.published : mn.draft}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(badge)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(badge.id)}>
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
