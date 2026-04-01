import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import type { AttractionImage, Attraction } from '../types/database';
import { DataTable } from '../components/ui/DataTable';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, Search, ExternalLink } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export function AttractionImagesPage() {
    const queryClient = useQueryClient();
    const { selectedScenicId } = useAppStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingImage, setEditingImage] = useState<AttractionImage | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

    // Provide defaults for fields
    const [formData, setFormData] = useState<Partial<AttractionImage>>({
        scenic_id: '',
        attraction_id: '',
        image_url: '',
        caption: '',
        sort_order: 0
    });

    // Remove unused scenic spots lookup in this page.

    const { data: attractions = [] } = useQuery({
        queryKey: ['attractions_lookup', selectedScenicId],
        queryFn: async () => {
            if (!selectedScenicId) return [];
            const { data, error } = await supabase.from('attractions')
                .select('id, name, is_active')
                .eq('scenic_id', selectedScenicId)
                .eq('is_active', true)
                .order('name', { ascending: true });
            if (error) throw error;
            return data as Pick<Attraction, 'id' | 'name' | 'is_active'>[];
        },
        enabled: !!selectedScenicId
    });

    const attractionMap = useMemo(() => {
        return attractions.reduce((acc, attr) => {
            acc[attr.id] = { name: attr.name, is_active: !!attr.is_active };
            return acc;
        }, {} as Record<string, { name: string, is_active: boolean }>);
    }, [attractions]);

    const { data: images = [], isLoading, isError, error: queryError } = useQuery({
        queryKey: ['attraction_images', selectedScenicId],
        queryFn: async () => {
            if (!selectedScenicId) return [];
            const { data, error } = await supabase.from('attraction_images')
                .select('*')
                .eq('scenic_id', selectedScenicId)
                .order('attraction_id', { ascending: true })
                .order('sort_order', { ascending: true });
            if (error) throw error;
            return data as AttractionImage[];
        },
        enabled: !!selectedScenicId,
    });

    const mutation = useMutation({
        mutationFn: async (img: Partial<AttractionImage>) => {
            const currentScenicId = selectedScenicId;
            if (!currentScenicId) throw new Error("未选择景区");

            if (editingImage) {
                const { error } = await supabase.from('attraction_images').update({
                    scenic_id: currentScenicId,
                    attraction_id: img.attraction_id,
                    image_url: img.image_url,
                    caption: img.caption,
                    sort_order: img.sort_order ? Number(img.sort_order) : 0,
                }).eq('id', editingImage.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('attraction_images').insert({
                    scenic_id: currentScenicId,
                    attraction_id: img.attraction_id,
                    image_url: img.image_url,
                    caption: img.caption,
                    sort_order: img.sort_order ? Number(img.sort_order) : 0,
                });
                if (error) throw error;
            }
        },
        onMutate: async (newImage) => {
            const currentScenicId = selectedScenicId;
            await queryClient.cancelQueries({ queryKey: ['attraction_images', currentScenicId] });
            const previousImages = queryClient.getQueryData<AttractionImage[]>(['attraction_images', currentScenicId]);

            if (previousImages) {
                queryClient.setQueryData<AttractionImage[]>(['attraction_images', currentScenicId], old => {
                    const oldData = old || [];
                    if (editingImage) {
                        return oldData.map(img => img.id === editingImage.id ? { ...img, ...newImage } as AttractionImage : img);
                    } else {
                        return [{
                            id: newImage.id || Date.now(),
                            attraction_id: newImage.attraction_id || '',
                            scenic_id: currentScenicId || '',
                            image_url: newImage.image_url || '',
                            caption: newImage.caption || '',
                            sort_order: newImage.sort_order || 0,
                            created_at: new Date().toISOString(),
                        } as AttractionImage, ...oldData];
                    }
                });
            }

            return { previousImages, currentScenicId };
        },
        onSuccess: () => {
            handleCloseModal();
            toast.success(editingImage ? '图片更新成功！' : '图片上传成功！');
        },
        onError: (err, _newImage, context) => {
            if (context?.previousImages && context.currentScenicId) {
                queryClient.setQueryData(['attraction_images', context.currentScenicId], context.previousImages);
            }
            toast.error(`错误：${err.message}`);
        },
        onSettled: (_data, _error, _variables, context) => {
            if (context?.currentScenicId) {
                queryClient.invalidateQueries({ queryKey: ['attraction_images', context.currentScenicId] });
            }
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase.from('attraction_images').delete().eq('id', id);
            if (error) throw error;
        },
        onMutate: async (id: number) => {
            const currentScenicId = selectedScenicId;
            await queryClient.cancelQueries({ queryKey: ['attraction_images', currentScenicId] });
            const previousImages = queryClient.getQueryData<AttractionImage[]>(['attraction_images', currentScenicId]);

            if (previousImages) {
                queryClient.setQueryData<AttractionImage[]>(['attraction_images', currentScenicId], old => {
                    return (old || []).filter(img => img.id !== id);
                });
            }

            return { previousImages, currentScenicId };
        },
        onSuccess: () => {
            toast.success('图片删除成功！');
        },
        onError: (err, _id, context) => {
            if (context?.previousImages && context.currentScenicId) {
                queryClient.setQueryData(['attraction_images', context.currentScenicId], context.previousImages);
            }
            toast.error(`删除失败：${err.message}`);
        },
        onSettled: (_data, _error, _variables, context) => {
            if (context?.currentScenicId) {
                queryClient.invalidateQueries({ queryKey: ['attraction_images', context.currentScenicId] });
            }
        }
    });

    const handleOpenModal = (img?: AttractionImage) => {
        if (img) {
            setEditingImage(img);
            setFormData(img);
        } else {
            setEditingImage(null);
            setFormData({
                scenic_id: '', attraction_id: '', image_url: '', caption: '', sort_order: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingImage(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.image_url || !formData.attraction_id) {
            toast.error('所属景点和图片链接为必填项');
            return;
        }
        mutation.mutate(formData);
    };

    const filteredImages = images.filter(img => {
        const attractionInfo = attractionMap[img.attraction_id];
        const attractionName = attractionInfo?.name || '';
        const isActive = attractionInfo?.is_active ?? false;

        // Status filter logic
        let matchesStatus = true;
        if (statusFilter === 'active') matchesStatus = isActive;
        else if (statusFilter === 'inactive') matchesStatus = !isActive;

        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = (
            (img.caption || '').toLowerCase().includes(searchLower) ||
            attractionName.toLowerCase().includes(searchLower) ||
            img.attraction_id.toLowerCase().includes(searchLower)
        );

        return matchesStatus && matchesSearch;
    });

    const columns: ColumnDef<AttractionImage>[] = [
        { accessorKey: 'id', header: 'ID' },
        {
            accessorKey: 'image_url',
            header: '预览',
            cell: ({ row }) => (
                <div className="relative group flex items-center">
                    <img
                        src={row.original.image_url}
                        alt={row.original.caption || 'Image'}
                        referrerPolicy="no-referrer"
                        className="h-12 w-12 object-cover rounded-lg border border-white/10 group-hover:scale-110 transition-transform cursor-pointer"
                        onClick={() => window.open(row.original.image_url, '_blank', 'noreferrer')}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <ExternalLink className="h-4 w-4 text-white drop-shadow-md" />
                    </div>
                </div>
            )
        },
        { accessorKey: 'scenic_id', header: '所属景区' },
        {
            accessorKey: 'attraction_id',
            header: '所属景点',
            cell: ({ row }) => {
                const attr = attractionMap[row.original.attraction_id];
                return attr ? `${attr.name} (${row.original.attraction_id})` : row.original.attraction_id;
            }
        },
        { accessorKey: 'caption', header: '图片说明' },
        { accessorKey: 'sort_order', header: '排序' },
        {
            id: 'actions',
            header: '操作',
            cell: ({ row }) => (
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(row.original)}>
                        <Edit2 className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            if (window.confirm('确定要删除此图片吗？')) {
                                deleteMutation.mutate(row.original.id);
                            }
                        }}
                    >
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                </div>
            )
        }
    ];

    if (!selectedScenicId) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <h2 className="text-2xl font-semibold mb-2">未选择景区</h2>
                <p className="text-muted-foreground">请在顶部导航栏选择您要管理的景区</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">景点图片</h1>
                    <p className="text-muted-foreground mt-1">管理当前景点内的相关图片。</p>
                </div>
                <Button onClick={() => handleOpenModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加图片
                </Button>
            </div>

            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="relative flex-1 max-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="搜索图片说明、景点名称或ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-transparent"
                    />
                </div>
                <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg border border-white/10">
                    <button
                        onClick={() => setStatusFilter('active')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${statusFilter === 'active' ? 'bg-blue-500 text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`}
                    >
                        仅子景点生效
                    </button>
                    <button
                        onClick={() => setStatusFilter('inactive')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${statusFilter === 'inactive' ? 'bg-blue-500 text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`}
                    >
                        仅子景点失效
                    </button>
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${statusFilter === 'all' ? 'bg-blue-500 text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`}
                    >
                        全部
                    </button>
                </div>
            </div>

            {isLoading ? (
                <TableSkeleton rows={5} columns={6} />
            ) : isError ? (
                <div className="h-64 flex flex-col items-center justify-center text-red-500 gap-2">
                    <p className="font-medium">数据加载失败</p>
                    <p className="text-sm text-muted-foreground">{(queryError as any)?.message || '未知错误'}</p>
                </div>
            ) : (
                <DataTable columns={columns} data={filteredImages} />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingImage ? '编辑图片' : '添加图片'}
            >
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2 col-span-2">
                        <Label htmlFor="attraction_id">所属景点 *</Label>
                        <select
                            id="attraction_id"
                            value={formData.attraction_id || ''}
                            onChange={(e) => setFormData({ ...formData, attraction_id: e.target.value })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            required
                            disabled={!selectedScenicId}
                        >
                            <option value="" disabled>选择景点</option>
                            {attractions.map(attr => (
                                <option key={attr.id} value={attr.id}>{attr.name} ({attr.id})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="image_url">图片链接 *</Label>
                        <Input
                            id="image_url"
                            type="url"
                            value={formData.image_url}
                            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                            required
                        />
                        {formData.image_url && (
                            <img src={formData.image_url} alt="Preview" referrerPolicy="no-referrer" className="h-32 object-contain mt-2 border rounded p-1" />
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="caption">图片说明</Label>
                        <Input
                            id="caption"
                            value={formData.caption || ''}
                            onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="sort_order">排序</Label>
                        <Input
                            id="sort_order" type="number"
                            value={formData.sort_order || 0}
                            onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={handleCloseModal}>取消</Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? '保存中...' : '保存'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div >
    );
}
