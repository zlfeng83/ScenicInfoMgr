import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Label } from './Label';

describe('Label', () => {
    it('renders with children', () => {
        render(<Label>My Label</Label>);
        expect(screen.getByText('My Label')).toBeInTheDocument();
    });

    it('applies custom className', () => {
        render(<Label className="custom-class">My Label</Label>);
        expect(screen.getByText('My Label')).toHaveClass('custom-class');
    });

    it('forwards ref correctly', () => {
        const ref = { current: null };
        render(<Label ref={ref}>My Label</Label>);
        expect(ref.current).toBeInstanceOf(HTMLLabelElement);
    });

    it('passes through extra props', () => {
        render(<Label htmlFor="input-id">My Label</Label>);
        expect(screen.getByText('My Label')).toHaveAttribute('for', 'input-id');
    });
});
