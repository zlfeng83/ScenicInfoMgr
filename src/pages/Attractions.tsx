import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import type { Attraction } from '../types/database';
import { DataTable } from '../components/ui/DataTable';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

export function AttractionsPage() {
    const queryClient = useQueryClient();
    const { selectedScenicId } = useAppStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAttraction, setEditingAttraction] = useState<Attraction | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

    // Provide defaults for ALL fields
    const [formData, setFormData] = useState<Partial<Attraction>>({
        id: '',
        scenic_id: '',
        name: '',
        longitude: 0,
        latitude: 0,
        altitude: 0,
        description: '',
        source_url: '',
        opening_time: '',
        closing_time: '',
        is_active: false
    });

    const { data: attractions = [], isLoading, isError, error: queryError } = useQuery({
        queryKey: ['attractions', selectedScenicId],
        queryFn: async () => {
            if (!selectedScenicId) return [];
            const { data, error } = await supabase.from('attractions')
                .select('*')
                .eq('scenic_id', selectedScenicId)
                .eq('is_active', true)
                .order('name', { ascending: true });
            if (error) throw error;
            return data as Attraction[];
        },
        enabled: !!selectedScenicId,
    });

    const mutation = useMutation({
        mutationFn: async (attraction: Partial<Attraction>) => {
            const currentScenicId = selectedScenicId;
            if (!currentScenicId) throw new Error("未选择景区");

            if (editingAttraction) {
                const { error } = await supabase.from('attractions').update({
                    scenic_id: currentScenicId,
                    name: attraction.name,
                    longitude: attraction.longitude ? Number(attraction.longitude) : null,
                    latitude: attraction.latitude ? Number(attraction.latitude) : null,
                    altitude: attraction.altitude ? Number(attraction.altitude) : null,
                    description: attraction.description,
                    source_url: attraction.source_url,
                    opening_time: attraction.opening_time,
                    closing_time: attraction.closing_time,
                    is_active: attraction.is_active ?? false,
                    updated_at: new Date().toISOString()
                }).eq('id', editingAttraction.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('attractions').insert({
                    id: attraction.id,
                    scenic_id: currentScenicId,
                    name: attraction.name,
                    longitude: attraction.longitude ? Number(attraction.longitude) : null,
                    latitude: attraction.latitude ? Number(attraction.latitude) : null,
                    altitude: attraction.altitude ? Number(attraction.altitude) : null,
                    description: attraction.description,
                    source_url: attraction.source_url,
                    opening_time: attraction.opening_time,
                    closing_time: attraction.closing_time,
                    is_active: attraction.is_active ?? false
                });
                if (error) throw error;
            }
        },
        onMutate: async (newAttraction) => {
            const currentScenicId = selectedScenicId;
            await queryClient.cancelQueries({ queryKey: ['attractions', currentScenicId] });
            const previousAttractions = queryClient.getQueryData<Attraction[]>(['attractions', currentScenicId]);

            if (previousAttractions) {
                queryClient.setQueryData<Attraction[]>(['attractions', currentScenicId], old => {
                    const oldData = old || [];
                    if (editingAttraction) {
                        return oldData.map(attr => attr.id === editingAttraction.id ? { ...attr, ...newAttraction } as Attraction : attr);
                    } else {
                        return [{
                            id: newAttraction.id || '',
                            scenic_id: currentScenicId || '',
                            name: newAttraction.name || '',
                            longitude: newAttraction.longitude ? Number(newAttraction.longitude) : undefined,
                            latitude: newAttraction.latitude ? Number(newAttraction.latitude) : undefined,
                            altitude: newAttraction.altitude ? Number(newAttraction.altitude) : undefined,
                            description: newAttraction.description || '',
                            source_url: newAttraction.source_url || '',
                            opening_time: newAttraction.opening_time || '',
                            closing_time: newAttraction.closing_time || '',
                            is_active: newAttraction.is_active ?? false,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        } as Attraction, ...oldData];
                    }
                });
            }

            return { previousAttractions, currentScenicId };
        },
        onSuccess: () => {
            handleCloseModal();
            toast.success(editingAttraction ? '景点更新成功！' : '景点创建成功！');
        },
        onError: (err, _newAttraction, context) => {
            if (context?.previousAttractions && context.currentScenicId) {
                queryClient.setQueryData(['attractions', context.currentScenicId], context.previousAttractions);
            }
            toast.error(`错误：${err.message}`);
        },
        onSettled: (_data, _error, _variables, context) => {
            if (context?.currentScenicId) {
                queryClient.invalidateQueries({ queryKey: ['attractions', context.currentScenicId] });
            }
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('attractions').delete().eq('id', id);
            if (error) throw error;
        },
        onMutate: async (id: string) => {
            const currentScenicId = selectedScenicId;
            await queryClient.cancelQueries({ queryKey: ['attractions', currentScenicId] });
            const previousAttractions = queryClient.getQueryData<Attraction[]>(['attractions', currentScenicId]);

            if (previousAttractions) {
                queryClient.setQueryData<Attraction[]>(['attractions', currentScenicId], old => {
                    return (old || []).filter(attr => attr.id !== id);
                });
            }

            return { previousAttractions, currentScenicId };
        },
        onSuccess: () => {
            toast.success('景点删除成功！');
        },
        onError: (err, _id, context) => {
            if (context?.previousAttractions && context.currentScenicId) {
                queryClient.setQueryData(['attractions', context.currentScenicId], context.previousAttractions);
            }
            toast.error(`删除失败：${err.message}`);
        },
        onSettled: (_data, _error, _variables, context) => {
            if (context?.currentScenicId) {
                queryClient.invalidateQueries({ queryKey: ['attractions', context.currentScenicId] });
            }
        }
    });

    const batchUpdateMutation = useMutation({
        mutationFn: async ({ ids, is_active }: { ids: string[], is_active: boolean }) => {
            const currentScenicId = selectedScenicId;
            if (!currentScenicId) throw new Error("未选择景区");

            const { error } = await supabase.from('attractions')
                .update({ is_active, updated_at: new Date().toISOString() })
                .in('id', ids)
                .eq('scenic_id', currentScenicId);

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            toast.success(`成功批量${variables.is_active ? '生效' : '失效'}景点！`);
            setSelectedIds(new Set());
            queryClient.invalidateQueries({ queryKey: ['attractions', selectedScenicId] });
        },
        onError: (err) => {
            toast.error(`批量操作失败：${err.message}`);
        }
    });

    const handleOpenModal = (attraction?: Attraction) => {
        if (attraction) {
            setEditingAttraction(attraction);
            setFormData(attraction);
        } else {
            setEditingAttraction(null);
            setFormData({
                id: '', scenic_id: '', name: '',
                longitude: 0, latitude: 0, altitude: 0,
                description: '', source_url: '', opening_time: '', closing_time: '', is_active: false
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAttraction(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.id || !formData.name) {
            toast.error('ID和名称为必填项');
            return;
        }
        mutation.mutate(formData);
    };

    const filteredAttractions = attractions.filter(attr => {
        const matchesSearch = attr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            attr.id.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && attr.is_active) ||
            (statusFilter === 'inactive' && !attr.is_active);

        return matchesSearch && matchesStatus;
    });

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredAttractions.length && filteredAttractions.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredAttractions.map(a => a.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const columns: ColumnDef<Attraction>[] = [
        {
            id: 'select',
            header: () => (
                <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-white/20 bg-white/5 cursor-pointer accent-blue-500"
                    checked={selectedIds.size === filteredAttractions.length && filteredAttractions.length > 0}
                    onChange={toggleSelectAll}
                />
            ),
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-white/20 bg-white/5 cursor-pointer accent-blue-500"
                    checked={selectedIds.has(row.original.id)}
                    onChange={() => toggleSelect(row.original.id)}
                />
            )
        },
        { accessorKey: 'id', header: 'ID' },
        { accessorKey: 'name', header: '名称' },
        { accessorKey: 'scenic_id', header: '所属景区' },
        {
            accessorKey: 'is_active',
            header: '状态',
            cell: ({ row }) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.original.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {row.original.is_active ? '已生效' : '未生效'}
                </span>
            )
        },
        { accessorKey: 'opening_time', header: '开放时间' },
        { accessorKey: 'closing_time', header: '关闭时间' },
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
                            if (window.confirm('确定要删除此景点吗？')) {
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
                    <h1 className="text-3xl font-bold tracking-tight">景点管理</h1>
                    <p className="text-muted-foreground mt-1">管理当前景区内的各个景点。</p>
                </div>
                <Button onClick={() => handleOpenModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加景点
                </Button>
            </div>

            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="搜索景点名称或ID..."
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
                        仅生效
                    </button>
                    <button
                        onClick={() => setStatusFilter('inactive')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${statusFilter === 'inactive' ? 'bg-blue-500 text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`}
                    >
                        仅失效
                    </button>
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${statusFilter === 'all' ? 'bg-blue-500 text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`}
                    >
                        全部
                    </button>
                </div>
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                        <span className="text-sm text-muted-foreground mr-2">已选 {selectedIds.size} 项</span>
                        <Button
                            variant="outline"
                            className="text-green-400 border-green-500/30 hover:bg-green-500/20"
                            onClick={() => batchUpdateMutation.mutate({ ids: Array.from(selectedIds), is_active: true })}
                            disabled={batchUpdateMutation.isPending}
                        >
                            批量生效
                        </Button>
                        <Button
                            variant="outline"
                            className="text-red-400 border-red-500/30 hover:bg-red-500/20"
                            onClick={() => batchUpdateMutation.mutate({ ids: Array.from(selectedIds), is_active: false })}
                            disabled={batchUpdateMutation.isPending}
                        >
                            批量失效
                        </Button>
                    </div>
                )}
            </div>

            {isLoading ? (
                <TableSkeleton rows={5} columns={5} />
            ) : isError ? (
                <div className="h-64 flex flex-col items-center justify-center text-red-500 gap-2">
                    <p className="font-medium">数据加载失败</p>
                    <p className="text-sm text-muted-foreground">{(queryError as any)?.message || '未知错误'}</p>
                </div>
            ) : (
                <DataTable columns={columns} data={filteredAttractions} />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingAttraction ? '编辑景点' : '创建景点'}
            >
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="id">ID（唯一标识） *</Label>
                            <Input
                                id="id"
                                disabled={!!editingAttraction}
                                value={formData.id}
                                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                                placeholder="e.g. lys_tianwangdian"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">名称 *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2 flex items-center pt-8">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-white/20 bg-white/5 accent-blue-500"
                                    checked={formData.is_active || false}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                />
                                <span className="text-sm">是否生效</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="longitude">经度 (GCJ-02)</Label>
                            <Input
                                id="longitude" type="number" step="any"
                                value={formData.longitude || ''}
                                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="latitude">纬度 (GCJ-02)</Label>
                            <Input
                                id="latitude" type="number" step="any"
                                value={formData.latitude || ''}
                                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="altitude">海拔 (m)</Label>
                            <Input
                                id="altitude" type="number" step="any"
                                value={formData.altitude || ''}
                                onChange={(e) => setFormData({ ...formData, altitude: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="opening_time">开放时间</Label>
                            <Input
                                id="opening_time" type="time"
                                value={formData.opening_time || ''}
                                onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="closing_time">关闭时间</Label>
                            <Input
                                id="closing_time" type="time"
                                value={formData.closing_time || ''}
                                onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="source_url">来源链接</Label>
                        <Input
                            id="source_url" type="url"
                            value={formData.source_url || ''}
                            onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">官方描述</Label>
                        <textarea
                            id="description"
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
        </div>
    );
}
