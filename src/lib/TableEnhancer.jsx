import { useEffect } from 'react';

const FILTER_ROW_ATTR = 'data-nvion-filter-row';
const SORT_INDICATOR_ATTR = 'data-nvion-sort-indicator';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function parseComparableValue(value) {
  const text = String(value || '').trim();
  if (!text) return { type: 'text', value: '' };

  const numericCandidate = text
    .replace(/R\$/gi, '')
    .replace(/%/g, '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');

  const numericValue = Number(numericCandidate);
  if (numericCandidate && Number.isFinite(numericValue)) {
    return { type: 'number', value: numericValue };
  }

  const dateValue = Date.parse(text);
  if (/^\d{4}-\d{2}-\d{2}/.test(text) && Number.isFinite(dateValue)) {
    return { type: 'number', value: dateValue };
  }

  return { type: 'text', value: normalizeText(text) };
}

function getCellText(row, columnIndex) {
  return row.children[columnIndex]?.textContent || '';
}

function compareRows(rowA, rowB, columnIndex, direction) {
  const valueA = parseComparableValue(getCellText(rowA, columnIndex));
  const valueB = parseComparableValue(getCellText(rowB, columnIndex));

  let result;
  if (valueA.type === 'number' && valueB.type === 'number') {
    result = valueA.value - valueB.value;
  } else {
    result = String(valueA.value).localeCompare(String(valueB.value), 'pt-BR', { numeric: true });
  }

  return direction === 'asc' ? result : -result;
}

function updateSortIndicators(table, activeColumnIndex, direction) {
  table.querySelectorAll(`[${SORT_INDICATOR_ATTR}]`).forEach((indicator) => {
    indicator.textContent = '';
  });

  const headerRow = getHeaderRow(table);
  const activeHeader = headerRow?.children[activeColumnIndex];
  const activeIndicator = activeHeader?.querySelector(`[${SORT_INDICATOR_ATTR}]`);
  if (activeIndicator) {
    activeIndicator.textContent = direction === 'asc' ? ' ↑' : ' ↓';
  }
}

function getHeaderRow(table) {
  return Array.from(table.tHead?.rows || []).find((row) => row.getAttribute(FILTER_ROW_ATTR) !== 'true');
}

function getBodyRows(table) {
  return Array.from(table.tBodies?.[0]?.rows || []);
}

function applyColumnFilters(table) {
  const filterRow = table.querySelector(`tr[${FILTER_ROW_ATTR}="true"]`);
  if (!filterRow) return;

  const filters = Array.from(filterRow.querySelectorAll('input')).map((input) => normalizeText(input.value));
  getBodyRows(table).forEach((row) => {
    const isVisible = filters.every((filter, columnIndex) => {
      if (!filter) return true;
      return normalizeText(getCellText(row, columnIndex)).includes(filter);
    });
    row.style.display = isVisible ? '' : 'none';
  });
}

function sortTable(table, columnIndex) {
  const tbody = table.tBodies?.[0];
  if (!tbody) return;

  const currentColumn = table.dataset.nvionSortColumn;
  const currentDirection = table.dataset.nvionSortDirection || 'asc';
  const nextDirection = currentColumn === String(columnIndex) && currentDirection === 'asc' ? 'desc' : 'asc';

  const rows = getBodyRows(table);
  rows.sort((rowA, rowB) => compareRows(rowA, rowB, columnIndex, nextDirection));
  rows.forEach((row) => tbody.appendChild(row));

  table.dataset.nvionSortColumn = String(columnIndex);
  table.dataset.nvionSortDirection = nextDirection;
  updateSortIndicators(table, columnIndex, nextDirection);
  applyColumnFilters(table);
}

function createFilterRow(table, headerRow) {
  const previous = table.querySelector(`tr[${FILTER_ROW_ATTR}="true"]`);
  if (previous) previous.remove();

  const filterRow = document.createElement('tr');
  filterRow.setAttribute(FILTER_ROW_ATTR, 'true');
  filterRow.className = 'border-b bg-slate-50/80';

  Array.from(headerRow.children).forEach((headerCell, columnIndex) => {
    const th = document.createElement('th');
    th.className = 'px-2 py-1';

    const label = headerCell.textContent?.trim() || '';
    if (label) {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Filtrar';
      input.setAttribute('aria-label', `Filtrar ${label}`);
      input.className = 'h-7 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-normal text-slate-700 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300';
      input.addEventListener('click', (event) => event.stopPropagation());
      input.addEventListener('input', () => applyColumnFilters(table));
      th.appendChild(input);
    }

    th.dataset.columnIndex = String(columnIndex);
    filterRow.appendChild(th);
  });

  headerRow.insertAdjacentElement('afterend', filterRow);
}

function enhanceTable(table) {
  if (!(table instanceof HTMLTableElement)) return;
  if (!table.tHead || !table.tBodies?.[0]) return;

  const headerRow = getHeaderRow(table);
  if (!headerRow || headerRow.children.length === 0) return;

  table.dataset.nvionEnhancedTable = 'true';
  table.classList.add('nvion-enhanced-table');

  Array.from(headerRow.children).forEach((headerCell, columnIndex) => {
    const label = headerCell.textContent?.trim() || '';
    if (!label) return;

    headerCell.classList.add('cursor-pointer', 'select-none', 'whitespace-nowrap');
    headerCell.title = headerCell.title || `Ordenar por ${label}`;

    if (!headerCell.querySelector(`[${SORT_INDICATOR_ATTR}]`)) {
      const indicator = document.createElement('span');
      indicator.setAttribute(SORT_INDICATOR_ATTR, 'true');
      indicator.className = 'text-xs text-slate-400';
      headerCell.appendChild(indicator);
    }

    if (headerCell.dataset.nvionSortHandler === 'true') return;
    headerCell.dataset.nvionSortHandler = 'true';
    headerCell.addEventListener('click', (event) => {
      if (event.target.closest('button, a, input, select, textarea, [role="button"]')) return;
      sortTable(table, columnIndex);
    });
  });

  const filterRow = table.querySelector(`tr[${FILTER_ROW_ATTR}="true"]`);
  if (!filterRow || filterRow.children.length !== headerRow.children.length) {
    createFilterRow(table, headerRow);
  }
}

function enhanceAllTables() {
  document.querySelectorAll('table').forEach(enhanceTable);
}

export default function TableEnhancer() {
  useEffect(() => {
    let frameId = null;
    const scheduleEnhancement = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(enhanceAllTables);
    };

    scheduleEnhancement();

    const observer = new MutationObserver(scheduleEnhancement);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  return null;
}
