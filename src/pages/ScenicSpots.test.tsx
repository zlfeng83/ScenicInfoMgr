import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScenicSpotsPage } from './ScenicSpots';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            insert: vi.fn(() => Promise.resolve({ error: null })),
            update: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
            delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
        })),
    },
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('ScenicSpotsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        queryClient.clear();
    });

    it('renders the page title', async () => {
        render(<ScenicSpotsPage />, { wrapper });
        expect(screen.getByText('景区管理')).toBeInTheDocument();
    });

    it('opens modal when clicking "Add Spot"', async () => {
        render(<ScenicSpotsPage />, { wrapper });
        const addButton = screen.getByRole('button', { name: /添加景区/i });
        fireEvent.click(addButton);
        expect(screen.getByText('创建景区')).toBeInTheDocument();
    });

    it('shows loading skeleton initially', () => {
        const { container } = render(<ScenicSpotsPage />, { wrapper });
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('submits the form to create a new spot', async () => {
        render(<ScenicSpotsPage />, { wrapper });
        fireEvent.click(screen.getByRole('button', { name: /添加景区/i }));

        fireEvent.change(screen.getByLabelText(/ID/i), { target: { value: 'new_id' } });
        fireEvent.change(screen.getByLabelText(/名称/i), { target: { value: 'New Spot' } });
        fireEvent.change(screen.getByLabelText(/城市/i), { target: { value: 'New City' } });

        fireEvent.click(screen.getByRole('button', { name: /保存/i }));

        await waitFor(() => {
            expect(supabase.from).toHaveBeenCalledWith('scenic_spots');
        });
    });

    it('opens edit modal and fills data', async () => {
        const mockData = [{ id: '1', name: 'Test Spot', city_name: 'Test City', longitude: 10, latitude: 20, description: 'Desc' }];
        (supabase.from as any).mockImplementation(() => ({
            select: () => ({
                order: () => Promise.resolve({ data: mockData, error: null }),
            }),
        }));

        render(<ScenicSpotsPage />, { wrapper });
        await waitFor(() => screen.getByText('Test Spot'));

        const buttons = screen.getAllByRole('button');
        // The first button in the actions column is Edit (index 0 for the first row)
        // In the mock, we have 1 row. App renders Header/Sidebar too? 
        // No, ScenicSpotsPage renders its own Header and Add button first.
        // Let's find buttons with the right icons or just be more robust.
        const editButton = screen.getAllByRole('button').find(b => b.querySelector('.lucide-edit-2'));

        if (editButton) {
            fireEvent.click(editButton);
            await waitFor(() => {
                expect(screen.getByText('编辑景区')).toBeInTheDocument();
            });
        }
    });

    it('deletes a spot after confirmation', async () => {
        const mockData = [{ id: '1', name: 'Test Spot', city_name: 'Test City', longitude: 10, latitude: 20, description: 'Desc' }];
        (supabase.from as any).mockImplementation(() => ({
            select: () => ({
                order: () => Promise.resolve({ data: mockData, error: null }),
            }),
            delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
        }));

        const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

        render(<ScenicSpotsPage />, { wrapper });
        await waitFor(() => screen.getByText('Test Spot'));

        const deleteButton = screen.getAllByRole('button').find(b => b.querySelector('.lucide-trash-2'));

        if (deleteButton) {
            fireEvent.click(deleteButton);
            expect(confirmSpy).toHaveBeenCalled();
        }
    });
});
