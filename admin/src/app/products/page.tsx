'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdminQuery } from '@/hooks/use-admin-query';
import { Plus, Pencil, Trash2, ImagePlus } from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
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
  imageUrls: [''],
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
    const images = productImages(p);
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
      imageUrls: images.length ? images : [''],
    });
    setOpen(true);
  };

  const updateImage = (index: number, value: string) => {
    setForm((prev) => {
      const next = [...prev.imageUrls];
      next[index] = value;
      return { ...prev, imageUrls: next };
    });
  };

  const addImage = () => {
    setForm((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, ''] }));
  };

  const removeImage = (index: number) => {
    setForm((prev) => {
      const next = prev.imageUrls.filter((_, i) => i !== index);
      return { ...prev, imageUrls: next.length ? next : [''] };
    });
  };

  const save = async () => {
    const imageUrls = form.imageUrls.map((url) => url.trim()).filter(Boolean);
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
  };

  const remove = async (id: string) => {
    if (!confirm(mn.deleteProduct)) return;
    await api.deleteProduct(id);
    load();
  };

  return (
    <AdminShell title={mn.products}>
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => { openCreate(); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> {mn.addProduct}
          </Button>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{editing ? mn.editProduct : mn.newProduct}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
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
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{mn.productImages}</Label>
                    <p className="text-xs text-muted-foreground">{mn.coverImageHint}</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addImage}>
                    <ImagePlus className="mr-2 h-4 w-4" /> {mn.addImage}
                  </Button>
                </div>
                {form.imageUrls.map((url, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        {index === 0 ? `${mn.imageUrl} (${mn.coverImageHint.split('.')[0]})` : `${mn.imageUrl} ${index + 1}`}
                      </Label>
                      <Input
                        value={url}
                        placeholder="https://images.unsplash.com/..."
                        onChange={(e) => updateImage(index, e.target.value)}
                      />
                    </div>
                    {form.imageUrls.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-6"
                        onClick={() => removeImage(index)}
                        aria-label={mn.removeImage}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
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
              <Button onClick={save}>{editing ? mn.update : mn.create}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{mn.product}</TableHead>
              <TableHead>{mn.category}</TableHead>
              <TableHead>{mn.price}</TableHead>
              <TableHead>{mn.stock}</TableHead>
              <TableHead>{mn.status}</TableHead>
              <TableHead className="text-right">{mn.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {productImages(p)[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={productImages(p)[0]}
                        alt={p.title}
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                        N/A
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>
                      {productImages(p).length > 1 && (
                        <div className="text-xs text-muted-foreground">{productImages(p).length} зураг</div>
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
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminShell>
  );
}
