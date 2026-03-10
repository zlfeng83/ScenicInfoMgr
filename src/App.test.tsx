import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// Mock Supabase to prevent real calls
vi.mock('./lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
        })),
    },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

describe('App', () => {
    it('renders the layout and default route', async () => {
        render(<App />);
        // The App renders a Navigate causing a redirect to /scenic-spots
        // ScenicSpotsPage has "Scenic Spots" title
        await waitFor(() => {
            expect(screen.getAllByText('景区管理')[0]).toBeInTheDocument();
        });
    });
});
