'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdminQuery } from '@/hooks/use-admin-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
import { MultiImageUploadField } from '@/components/multi-image-upload-field';
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
import { api, Product } from '@/lib/api';
import { mn } from '@/lib/mn';

type ProductForm = {
  title: string;
  description: string;
  category: string;
  price: string;
  rating: string;
  reviews: number;
  stock: number;
  sortOrder: number;
  isPublished: boolean;
  imageUrls: string[];
};

const emptyForm: ProductForm = {
  title: '',
  description: '',
  category: 'Суниалтын төхөөрөмж',
  price: '',
  rating: '4.5',
  reviews: 0,
  stock: 0,
  sortOrder: 0,
  isPublished: true,
  imageUrls: [],
};

function formatPrice(price: number | string) {
  return `${Number(price).toLocaleString()}₮`;
}

function productImages(product: Product) {
  if (product.imageUrls?.length) return product.imageUrls;
  return product.imageUrl ? [product.imageUrl] : [];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data } = useAdminQuery(() => api.getProducts(), [refreshKey]);

  useEffect(() => {
    if (data?.products) setProducts(data.products);
  }, [data]);

  const load = useCallback(() => setRefreshKey((k) => k + 1), []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      title: p.title,
      description: p.description || '',
      category: p.category || 'Суниалтын төхөөрөмж',
      price: String(p.price),
      rating: String(p.rating || 0),
      reviews: p.reviews || 0,
      stock: p.stock,
      sortOrder: p.sortOrder,
      isPublished: p.isPublished,
      imageUrls: productImages(p),
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const imageUrls = form.imageUrls.filter(Boolean);
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        price: Number(form.price),
        rating: Number(form.rating),
        reviews: Number(form.reviews),
        stock: Number(form.stock),
        sortOrder: Number(form.sortOrder),
        isPublished: form.isPublished,
        imageUrls,
        imageUrl: imageUrls[0] || null,
      };

      if (editing) {
        await api.updateProduct(editing.id, payload);
      } else {
        await api.createProduct(payload);
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
    if (!confirm(mn.deleteProduct)) return;
    await api.deleteProduct(id);
    load();
  };

  return (
    <AdminShell title={mn.products}>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> {mn.addProduct}
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        >
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{editing ? mn.editProduct : mn.newProduct}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid gap-4">
              <MultiImageUploadField
                label={mn.productImages}
                values={form.imageUrls}
                onChange={(imageUrls) => setForm({ ...form, imageUrls })}
                folder="sunialt/products"
              />
              <div className="space-y-2">
                <Label>{mn.title}</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{mn.description}</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{mn.category}</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{mn.price}</Label>
                  <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{mn.stock}</Label>
                  <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{mn.rating}</Label>
                  <Input type="number" step="0.1" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{mn.reviews}</Label>
                  <Input type="number" value={form.reviews} onChange={(e) => setForm({ ...form, reviews: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} />
                <Label>{mn.publish}</Label>
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
              <TableHead className="w-[42%] whitespace-normal">{mn.product}</TableHead>
              <TableHead>{mn.category}</TableHead>
              <TableHead>{mn.price}</TableHead>
              <TableHead>{mn.stock}</TableHead>
              <TableHead>{mn.status}</TableHead>
              <TableHead className="text-right">{mn.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const images = productImages(p);
              return (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-normal align-top">
                    <div className="flex min-w-0 items-start gap-3">
                      {images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={images[0]}
                          alt={p.title}
                          className="h-10 w-10 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                          N/A
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="break-words font-medium">{p.title}</div>
                        <div className="break-words text-xs text-muted-foreground line-clamp-2">{p.description}</div>
                        {images.length > 1 && (
                          <div className="text-xs text-muted-foreground">{images.length} зураг</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell>{formatPrice(p.price)}</TableCell>
                  <TableCell>{p.stock}</TableCell>
                  <TableCell>
                    <Badge variant={p.isPublished ? 'default' : 'secondary'}>
                      {p.isPublished ? mn.published : mn.draft}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </AdminShell>
  );
}
