import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DataTable } from './DataTable';
import type { ColumnDef } from '@tanstack/react-table';

interface TestData {
    id: number;
    name: string;
}

const columns: ColumnDef<TestData, any>[] = [
    {
        accessorKey: 'id',
        header: 'ID',
    },
    {
        accessorKey: 'name',
        header: 'Name',
    },
];

const data: TestData[] = [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Smith' },
];

describe('DataTable', () => {
    it('renders header correctly', () => {
        render(<DataTable columns={columns} data={data} />);
        expect(screen.getByText('ID')).toBeInTheDocument();
        expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('renders data correctly', () => {
        render(<DataTable columns={columns} data={data} />);
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('renders "No results found" when data is empty', () => {
        render(<DataTable columns={columns} data={[]} />);
        expect(screen.getByText('暂无数据')).toBeInTheDocument();
    });

    it('renders pagination buttons', () => {
        render(<DataTable columns={columns} data={data} />);
        expect(screen.getByRole('button', { name: /上一页/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /下一页/i })).toBeInTheDocument();
    });

    it('pagination buttons are disabled when on first/last page', () => {
        render(<DataTable columns={columns} data={data} />);
        const prevButton = screen.getByRole('button', { name: /上一页/i });
        const nextButton = screen.getByRole('button', { name: /下一页/i });
        expect(prevButton).toBeDisabled();
        expect(nextButton).toBeDisabled();
    });
});
