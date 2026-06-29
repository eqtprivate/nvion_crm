import React from 'react';
import { Input } from '@/components/ui/input';

export function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatPercent(value) {
  return `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function digitsToCurrency(rawValue) {
  const digits = String(rawValue || '').replace(/\D/g, '');
  if (!digits) return '';
  return String(Number(digits) / 100);
}

function percentToNumber(rawValue) {
  const normalized = String(rawValue || '')
    .replace('%', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.]/g, '');
  return normalized;
}

export function MoneyInput({ value, onChange, ...props }) {
  return (
    <Input
      {...props}
      inputMode="numeric"
      value={value === '' || value == null ? '' : formatCurrency(value)}
      onChange={(event) => onChange(digitsToCurrency(event.target.value))}
    />
  );
}

export function PercentInput({ value, onChange, ...props }) {
  return (
    <Input
      {...props}
      inputMode="decimal"
      value={value === '' || value == null ? '' : formatPercent(value)}
      onChange={(event) => onChange(percentToNumber(event.target.value))}
    />
  );
}
