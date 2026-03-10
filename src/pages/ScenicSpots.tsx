import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ScenicSpot } from '../types/database';
import { DataTable } from '../components/ui/DataTable';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

export function ScenicSpotsPage() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSpot, setEditingSpot] = useState<ScenicSpot | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Form State
    const [formData, setFormData] = useState<Partial<ScenicSpot>>({
        id: '', name: '', city_name: '', description: '', longitude: 0, latitude: 0
    });

    const { data: spots = [], isLoading, isError, error: queryError } = useQuery({
        queryKey: ['scenic_spots'],
        queryFn: async () => {
            const { data, error } = await supabase.from('scenic_spots').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data as ScenicSpot[];
        },
    });

    const mutation = useMutation({
        mutationFn: async (spot: Partial<ScenicSpot>) => {
            if (editingSpot) {
                // ID is not editable
                const { error } = await supabase.from('scenic_spots').update({
                    name: spot.name,
                    city_name: spot.city_name,
                    description: spot.description,
                    longitude: spot.longitude ? Number(spot.longitude) : null,
                    latitude: spot.latitude ? Number(spot.latitude) : null,
                    updated_at: new Date().toISOString()
                }).eq('id', editingSpot.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('scenic_spots').insert({
                    id: spot.id,
                    name: spot.name,
                    city_name: spot.city_name,
                    description: spot.description,
                    longitude: spot.longitude ? Number(spot.longitude) : null,
                    latitude: spot.latitude ? Number(spot.latitude) : null,
                });
                if (error) throw error;
            }
        },
        onMutate: async (newSpot) => {
            await queryClient.cancelQueries({ queryKey: ['scenic_spots'] });
            const previousSpots = queryClient.getQueryData<ScenicSpot[]>(['scenic_spots']);

            if (previousSpots) {
                queryClient.setQueryData<ScenicSpot[]>(['scenic_spots'], old => {
                    const oldData = old || [];
                    if (editingSpot) {
                        return oldData.map(spot => spot.id === editingSpot.id ? { ...spot, ...newSpot } : spot);
                    } else {
                        return [{
                            id: newSpot.id || '',
                            name: newSpot.name || '',
                            city_name: newSpot.city_name || '',
                            description: newSpot.description || '',
                            longitude: newSpot.longitude ? Number(newSpot.longitude) : undefined,
                            latitude: newSpot.latitude ? Number(newSpot.latitude) : undefined,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        } as ScenicSpot, ...oldData];
                    }
                });
            }

            handleCloseModal();
            return { previousSpots };
        },
        onSuccess: () => {
            toast.success(editingSpot ? '景区更新成功！' : '景区创建成功！');
        },
        onError: (err, _newSpot, context) => {
            if (context?.previousSpots) {
                queryClient.setQueryData(['scenic_spots'], context.previousSpots);
            }
            toast.error(`错误：${err.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['scenic_spots'] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('scenic_spots').delete().eq('id', id);
            if (error) throw error;
        },
        onMutate: async (id: string) => {
            await queryClient.cancelQueries({ queryKey: ['scenic_spots'] });
            const previousSpots = queryClient.getQueryData<ScenicSpot[]>(['scenic_spots']);

            if (previousSpots) {
                queryClient.setQueryData<ScenicSpot[]>(['scenic_spots'], old => {
                    return (old || []).filter(spot => spot.id !== id);
                });
            }

            return { previousSpots };
        },
        onSuccess: () => {
            toast.success('景区删除成功！');
        },
        onError: (err, _id, context) => {
            if (context?.previousSpots) {
                queryClient.setQueryData(['scenic_spots'], context.previousSpots);
            }
            toast.error(`删除失败：${err.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['scenic_spots'] });
        }
    });

    const handleOpenModal = (spot?: ScenicSpot) => {
        if (spot) {
            setEditingSpot(spot);
            setFormData(spot);
        } else {
            setEditingSpot(null);
            setFormData({ id: '', name: '', city_name: '', description: '', longitude: 0, latitude: 0 });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSpot(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.id || !formData.name) {
            toast.error('ID 和名称为必填项');
            return;
        }
        mutation.mutate(formData);
    };

    const filteredSpots = spots.filter(spot =>
        spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (spot.city_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const columns: ColumnDef<ScenicSpot>[] = [
        { accessorKey: 'id', header: 'ID' },
        { accessorKey: 'name', header: '名称' },
        { accessorKey: 'city_name', header: '城市' },
        { accessorKey: 'longitude', header: '经度' },
        { accessorKey: 'latitude', header: '纬度' },
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
                            if (window.confirm('确定要删除此景区吗？')) {
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

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">景区管理</h1>
                    <p className="text-muted-foreground mt-1">管理顶层景区信息。</p>
                </div>
                <Button onClick={() => handleOpenModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加景区
                </Button>
            </div>

            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="搜索景区名称、ID或城市..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-transparent"
                    />
                </div>
            </div>

            {isLoading ? (
                <TableSkeleton rows={5} columns={5} />
            ) : isError ? (
                <div className="h-64 flex flex-col items-center justify-center text-red-500 gap-2">
                    <p className="font-medium">数据加载失败</p>
                    <p className="text-sm text-muted-foreground">{(queryError as any)?.message || '未知错误'}</p>
                </div>
            ) : (
                <DataTable columns={columns} data={filteredSpots} />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingSpot ? '编辑景区' : '创建景区'}
            >
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="id">ID（唯一标识） *</Label>
                        <Input
                            id="id"
                            disabled={!!editingSpot}
                            value={formData.id}
                            onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                            placeholder="例如 lingyin_temple"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">名称 *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="景区名称"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="city_name">城市</Label>
                        <Input
                            id="city_name"
                            value={formData.city_name || ''}
                            onChange={(e) => setFormData({ ...formData, city_name: e.target.value })}
                            placeholder="例如 杭州"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="longitude">经度</Label>
                            <Input
                                id="longitude"
                                type="number" step="any"
                                value={formData.longitude || ''}
                                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="latitude">纬度</Label>
                            <Input
                                id="latitude"
                                type="number" step="any"
                                value={formData.latitude || ''}
                                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">描述</Label>
                        <textarea
                            id="description"
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="简要介绍..."
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
