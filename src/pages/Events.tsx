import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import type { Event, Attraction } from '../types/database';
import { DataTable } from '../components/ui/DataTable';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export function EventsPage() {
    const queryClient = useQueryClient();
    const { selectedScenicId } = useAppStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

    const [formData, setFormData] = useState<Partial<Event>>({
        scenic_id: '',
        event_date: '',
        start_time: '',
        end_time: '',
        name: '',
        attraction_id: '',
        description: ''
    });

    // Remove scenic Spots

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

    const { data: events = [], isLoading, isError, error: queryError } = useQuery({
        queryKey: ['events', selectedScenicId],
        queryFn: async () => {
            if (!selectedScenicId) return [];
            const { data, error } = await supabase.from('events')
                .select('*')
                .eq('scenic_id', selectedScenicId)
                .order('attraction_id', { ascending: true })
                .order('event_date', { ascending: false });
            if (error) throw error;
            return data as Event[];
        },
        enabled: !!selectedScenicId,
    });

    const mutation = useMutation({
        mutationFn: async (event: Partial<Event>) => {
            const currentScenicId = selectedScenicId;
            if (!currentScenicId) throw new Error("未选择景区");

            if (editingEvent) {
                const { error } = await supabase.from('events').update({
                    scenic_id: currentScenicId,
                    event_date: event.event_date,
                    start_time: event.start_time || null,
                    end_time: event.end_time || null,
                    name: event.name,
                    attraction_id: event.attraction_id || null,
                    description: event.description,
                    updated_at: new Date().toISOString()
                }).eq('id', editingEvent.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('events').insert({
                    scenic_id: currentScenicId,
                    event_date: event.event_date,
                    start_time: event.start_time || null,
                    end_time: event.end_time || null,
                    name: event.name,
                    attraction_id: event.attraction_id || null,
                    description: event.description,
                });
                if (error) throw error;
            }
        },
        onMutate: async (newEvent) => {
            const currentScenicId = selectedScenicId;
            await queryClient.cancelQueries({ queryKey: ['events', currentScenicId] });
            const previousEvents = queryClient.getQueryData<Event[]>(['events', currentScenicId]);

            if (previousEvents) {
                queryClient.setQueryData<Event[]>(['events', currentScenicId], old => {
                    const oldData = old || [];
                    if (editingEvent) {
                        return oldData.map(ev => ev.id === editingEvent.id ? { ...ev, ...newEvent } as Event : ev);
                    } else {
                        return [{
                            id: newEvent.id || Date.now(),
                            scenic_id: currentScenicId || '',
                            attraction_id: newEvent.attraction_id || null,
                            name: newEvent.name || '',
                            description: newEvent.description || '',
                            event_date: newEvent.event_date || new Date().toISOString().split('T')[0],
                            start_time: newEvent.start_time || undefined,
                            end_time: newEvent.end_time || undefined,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        } as Event, ...oldData];
                    }
                });
            }

            handleCloseModal();
            return { previousEvents, currentScenicId };
        },
        onSuccess: () => {
            toast.success(editingEvent ? '活动更新成功！' : '活动创建成功！');
        },
        onError: (err, _newEvent, context) => {
            if (context?.previousEvents && context.currentScenicId) {
                queryClient.setQueryData(['events', context.currentScenicId], context.previousEvents);
            }
            toast.error(`错误：${err.message}`);
        },
        onSettled: (_data, _error, _variables, context) => {
            if (context?.currentScenicId) {
                queryClient.invalidateQueries({ queryKey: ['events', context.currentScenicId] });
            }
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase.from('events').delete().eq('id', id);
            if (error) throw error;
        },
        onMutate: async (id: number) => {
            const currentScenicId = selectedScenicId;
            await queryClient.cancelQueries({ queryKey: ['events', currentScenicId] });
            const previousEvents = queryClient.getQueryData<Event[]>(['events', currentScenicId]);

            if (previousEvents) {
                queryClient.setQueryData<Event[]>(['events', currentScenicId], old => {
                    return (old || []).filter(ev => ev.id !== id);
                });
            }

            return { previousEvents, currentScenicId };
        },
        onSuccess: () => {
            toast.success('活动删除成功！');
        },
        onError: (err, _id, context) => {
            if (context?.previousEvents && context.currentScenicId) {
                queryClient.setQueryData(['events', context.currentScenicId], context.previousEvents);
            }
            toast.error(`删除失败：${err.message}`);
        },
        onSettled: (_data, _error, _variables, context) => {
            if (context?.currentScenicId) {
                queryClient.invalidateQueries({ queryKey: ['events', context.currentScenicId] });
            }
        }
    });

    const handleOpenModal = (event?: Event) => {
        if (event) {
            setEditingEvent(event);
            setFormData(event);
        } else {
            setEditingEvent(null);
            setFormData({
                scenic_id: '', event_date: '', start_time: '', end_time: '',
                name: '', attraction_id: '', description: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEvent(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.event_date) {
            toast.error('活动名称和日期为必填项');
            return;
        }
        mutation.mutate(formData);
    };

    const filteredEvents = events.filter(event => {
        const attractionInfo = event.attraction_id ? attractionMap[event.attraction_id] : null;
        const attractionName = attractionInfo ? attractionInfo.name : '景区级别';

        // Status filtering logic
        // If it's scenic level (no attraction_id), it's always included in 'active' filter? 
        // Or only filter if it HAS an attraction_id.
        // User said "子景点是否有效筛选条件", so it likely applies to items LINKED to sub-scenic spots.
        let matchesStatus = true;
        if (event.attraction_id) {
            const isActive = attractionInfo?.is_active ?? false;
            if (statusFilter === 'active') matchesStatus = isActive;
            else if (statusFilter === 'inactive') matchesStatus = !isActive;
        } else {
            // Scenic level: Decide if we show it. 
            // If filtering for 'active' only, we probably want to see scenic level events too as they are "valid".
            // If filtering for 'inactive', we probably only want to see things linked to inactive attractions.
            if (statusFilter === 'inactive') matchesStatus = false;
        }

        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = (
            event.name.toLowerCase().includes(searchLower) ||
            attractionName.toLowerCase().includes(searchLower) ||
            (event.description || '').toLowerCase().includes(searchLower)
        );

        return matchesStatus && matchesSearch;
    });

    const columns: ColumnDef<Event>[] = [
        { accessorKey: 'id', header: 'ID' },
        { accessorKey: 'name', header: '名称' },
        { accessorKey: 'scenic_id', header: '所属景区' },
        {
            accessorKey: 'attraction_id',
            header: '所属景点',
            cell: ({ row }) => {
                if (!row.original.attraction_id) return '景区级别';
                const attr = attractionMap[row.original.attraction_id];
                return attr ? `${attr.name} (${row.original.attraction_id})` : row.original.attraction_id;
            }
        },
        { accessorKey: 'event_date', header: '日期' },
        { accessorKey: 'start_time', header: '开始时间' },
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
                            if (window.confirm('确定要删除此活动吗？')) {
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
                    <h1 className="text-3xl font-bold tracking-tight">活动管理</h1>
                    <p className="text-muted-foreground mt-1">管理当前景区内的实时和计划活动。</p>
                </div>
                <Button onClick={() => handleOpenModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加活动
                </Button>
            </div>

            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="搜索活动名称、景点名称或描述..."
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
                <TableSkeleton rows={5} columns={5} />
            ) : isError ? (
                <div className="h-64 flex flex-col items-center justify-center text-red-500 gap-2">
                    <p className="font-medium">数据加载失败</p>
                    <p className="text-sm text-muted-foreground">{(queryError as any)?.message || '未知错误'}</p>
                </div>
            ) : (
                <DataTable columns={columns} data={filteredEvents} />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingEvent ? '编辑活动' : '添加活动'}
            >
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="attraction_id">关联景点</Label>
                            <select
                                id="attraction_id"
                                value={formData.attraction_id || ''}
                                onChange={(e) => setFormData({ ...formData, attraction_id: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={!selectedScenicId}
                            >
                                <option value="">无（景区级别）</option>
                                {attractions.map(attr => (
                                    <option key={attr.id} value={attr.id}>{attr.name} ({attr.id})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">活动名称 *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="event_date">日期 *</Label>
                            <Input
                                id="event_date" type="date"
                                value={formData.event_date || ''}
                                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="start_time">开始时间</Label>
                            <Input
                                id="start_time" type="time"
                                value={formData.start_time || ''}
                                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="end_time">结束时间</Label>
                            <Input
                                id="end_time" type="time"
                                value={formData.end_time || ''}
                                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
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
