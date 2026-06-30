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

export function formatCpfCnpj(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  if (digits.length <= 11) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
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

export function CpfCnpjInput({ value, onChange, ...props }) {
  return (
    <Input
      {...props}
      inputMode="numeric"
      value={formatCpfCnpj(value)}
      onChange={(event) => onChange(formatCpfCnpj(event.target.value))}
      maxLength={18}
    />
  );
}
