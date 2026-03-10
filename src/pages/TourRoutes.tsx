import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import type { TourRoute } from '../types/database';
import { DataTable } from '../components/ui/DataTable';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

export function TourRoutesPage() {
    const queryClient = useQueryClient();
    const { selectedScenicId } = useAppStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRoute, setEditingRoute] = useState<TourRoute | null>(null);

    const [formData, setFormData] = useState<Partial<TourRoute>>({
        scenic_id: '',
        name: '',
        description: '',
        estimated_duration: '',
        route_data: '{}'
    });

    // Remove scenicSpots query

    const { data: routes = [], isLoading, isError, error: queryError } = useQuery({
        queryKey: ['tour_routes', selectedScenicId],
        queryFn: async () => {
            if (!selectedScenicId) return [];
            const { data, error } = await supabase.from('tour_routes')
                .select('*')
                .eq('scenic_id', selectedScenicId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as TourRoute[];
        },
        enabled: !!selectedScenicId,
    });

    const mutation = useMutation({
        mutationFn: async (route: Partial<TourRoute>) => {
            const currentScenicId = selectedScenicId;
            if (!currentScenicId) throw new Error("未选择景区");

            let parsedRouteData = {};
            try {
                parsedRouteData = typeof route.route_data === 'string' ? JSON.parse(route.route_data) : route.route_data;
            } catch (e) {
                throw new Error('路线数据 JSON 格式无效');
            }

            if (editingRoute) {
                const { error } = await supabase.from('tour_routes').update({
                    scenic_id: currentScenicId,
                    name: route.name,
                    description: route.description,
                    estimated_duration: route.estimated_duration,
                    route_data: parsedRouteData,
                    updated_at: new Date().toISOString()
                }).eq('id', editingRoute.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('tour_routes').insert({
                    scenic_id: currentScenicId,
                    name: route.name,
                    description: route.description,
                    estimated_duration: route.estimated_duration,
                    route_data: parsedRouteData,
                });
                if (error) throw error;
            }
        },
        onMutate: async (newRoute) => {
            const currentScenicId = selectedScenicId;
            await queryClient.cancelQueries({ queryKey: ['tour_routes', currentScenicId] });
            const previousRoutes = queryClient.getQueryData<TourRoute[]>(['tour_routes', currentScenicId]);

            if (previousRoutes) {
                queryClient.setQueryData<TourRoute[]>(['tour_routes', currentScenicId], old => {
                    const oldData = old || [];
                    if (editingRoute) {
                        return oldData.map(route => route.id === editingRoute.id ? { ...route, ...newRoute } as TourRoute : route);
                    } else {
                        return [{
                            id: newRoute.id || Date.now(),
                            scenic_id: currentScenicId || '',
                            name: newRoute.name || '',
                            description: newRoute.description || '',
                            estimated_duration: newRoute.estimated_duration || '',
                            route_data: newRoute.route_data || {},
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        } as TourRoute, ...oldData];
                    }
                });
            }

            handleCloseModal();
            return { previousRoutes, currentScenicId };
        },
        onSuccess: () => {
            toast.success(editingRoute ? '路线更新成功！' : '路线创建成功！');
        },
        onError: (err, _newRoute, context) => {
            if (context?.previousRoutes && context.currentScenicId) {
                queryClient.setQueryData(['tour_routes', context.currentScenicId], context.previousRoutes);
            }
            toast.error(`错误：${err.message}`);
        },
        onSettled: (_data, _error, _variables, context) => {
            if (context?.currentScenicId) {
                queryClient.invalidateQueries({ queryKey: ['tour_routes', context.currentScenicId] });
            }
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase.from('tour_routes').delete().eq('id', id);
            if (error) throw error;
        },
        onMutate: async (id: number) => {
            const currentScenicId = selectedScenicId;
            await queryClient.cancelQueries({ queryKey: ['tour_routes', currentScenicId] });
            const previousRoutes = queryClient.getQueryData<TourRoute[]>(['tour_routes', currentScenicId]);

            if (previousRoutes) {
                queryClient.setQueryData<TourRoute[]>(['tour_routes', currentScenicId], old => {
                    return (old || []).filter(route => route.id !== id);
                });
            }

            return { previousRoutes, currentScenicId };
        },
        onSuccess: () => {
            toast.success('路线删除成功！');
        },
        onError: (err, _id, context) => {
            if (context?.previousRoutes && context.currentScenicId) {
                queryClient.setQueryData(['tour_routes', context.currentScenicId], context.previousRoutes);
            }
            toast.error(`删除失败：${err.message}`);
        },
        onSettled: (_data, _error, _variables, context) => {
            if (context?.currentScenicId) {
                queryClient.invalidateQueries({ queryKey: ['tour_routes', context.currentScenicId] });
            }
        }
    });

    const handleOpenModal = (route?: TourRoute) => {
        if (route) {
            setEditingRoute(route);
            setFormData({
                ...route,
                route_data: typeof route.route_data === 'object' ? JSON.stringify(route.route_data, null, 2) : route.route_data
            });
        } else {
            setEditingRoute(null);
            setFormData({
                scenic_id: '', name: '', description: '', estimated_duration: '', route_data: '{\n  "waypoints": []\n}'
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingRoute(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            toast.error('路线名称为必填项');
            return;
        }
        mutation.mutate(formData);
    };

    const columns: ColumnDef<TourRoute>[] = [
        { accessorKey: 'id', header: 'ID' },
        { accessorKey: 'name', header: '名称' },
        { accessorKey: 'scenic_id', header: '所属景区' },
        { accessorKey: 'estimated_duration', header: '预计时长' },
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
                            if (window.confirm('确定要删除此路线吗？')) {
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
                    <h1 className="text-3xl font-bold tracking-tight">游览路线</h1>
                    <p className="text-muted-foreground mt-1">管理当前景区内的推荐游览路线。</p>
                </div>
                <Button onClick={() => handleOpenModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加路线
                </Button>
            </div>

            {isLoading ? (
                <TableSkeleton rows={5} columns={4} />
            ) : isError ? (
                <div className="h-64 flex flex-col items-center justify-center text-red-500 gap-2">
                    <p className="font-medium">数据加载失败</p>
                    <p className="text-sm text-muted-foreground">{(queryError as any)?.message || '未知错误'}</p>
                </div>
            ) : (
                <DataTable columns={columns} data={routes} />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingRoute ? '编辑路线' : '添加路线'}
            >
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="estimated_duration">预计时长</Label>
                            <Input
                                id="estimated_duration"
                                value={formData.estimated_duration || ''}
                                onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                                placeholder="例如 2小时"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">路线名称 *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">描述</Label>
                        <textarea
                            id="description"
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="route_data">路线数据 (JSON) *</Label>
                        <textarea
                            id="route_data"
                            className="flex min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.route_data as string}
                            onChange={(e) => setFormData({ ...formData, route_data: e.target.value })}
                            required
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
