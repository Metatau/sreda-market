import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PropertyCard } from '../PropertyCard';
import type { Property } from '@/types';

const mockProperty: Property = {
  id: 1,
  title: 'Test Property',
  price: 5000000,
  pricePerSqm: 100000,
  area: '50',
  rooms: 2,
  address: 'Test Address',
  propertyType: 'apartment',
  source: 'test',
  autoClassified: false,
  manualOverride: false,
  isActive: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  propertyClass: {
    id: 1,
    name: 'Стандарт',
    minPricePerSqm: 80000,
    maxPricePerSqm: 120000,
    createdAt: '2024-01-01'
  },
  analytics: {
    id: 1,
    propertyId: 1,
    roi: '8.5',
    liquidityScore: 7,
    investmentRating: 'B+',
    calculatedAt: '2024-01-01'
  }
};

describe('PropertyCard', () => {
  it('renders property information correctly', () => {
    render(<PropertyCard property={mockProperty} />);
    
    expect(screen.getByText('Test Property')).toBeInTheDocument();
    expect(screen.getByText(/5.*000.*000/)).toBeInTheDocument();
    expect(screen.getByText('Test Address')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<PropertyCard property={mockProperty} onSelect={onSelect} />);
    
    const card = screen.getByRole('button');
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledWith(mockProperty);
  });

  it('displays property class badge', () => {
    render(<PropertyCard property={mockProperty} />);
    expect(screen.getByText('Стандарт')).toBeInTheDocument();
  });
});