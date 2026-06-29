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

export function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
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

export function PhoneInput({ value, onChange, ...props }) {
  return (
    <Input
      {...props}
      inputMode="tel"
      value={formatPhone(value)}
      onChange={(event) => onChange(formatPhone(event.target.value))}
      maxLength={15}
    />
  );
}
