import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        title: 'Test Modal',
        children: <div>Modal Content</div>
    };

    it('renders when isOpen is true', () => {
        render(<Modal {...defaultProps} />);
        expect(screen.getByText('Test Modal')).toBeInTheDocument();
        expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
        render(<Modal {...defaultProps} isOpen={false} />);
        expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    it('calls onClose when clicking the close button', () => {
        render(<Modal {...defaultProps} />);
        const closeButton = screen.getByRole('button', { name: /close/i });
        fireEvent.click(closeButton);
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('calls onClose when clicking the backdrop', () => {
        render(<Modal {...defaultProps} />);
        const backdrop = screen.getByRole('presentation', { hidden: true });
        fireEvent.click(backdrop);
        expect(defaultProps.onClose).toHaveBeenCalled();
    });
});
