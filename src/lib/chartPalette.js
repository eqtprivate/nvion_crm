import { useTheme } from 'next-themes';

// Paletas categóricas validadas (dataviz skill), por modo.
// Ordem fixa dos slots: azul, aqua, amarelo, vermelho.
const LIGHT = ['#2a78d6', '#1baf7a', '#eda100', '#e34948'];
const DARK = ['#3987e5', '#199e70', '#c98500', '#e66767'];

// Tokens de eixo/grade/texto por modo (recessivos).
const AXIS = {
  light: { grid: '#e2e8f0', axis: '#94a3b8', text: '#475569', surface: '#ffffff' },
  dark: { grid: '#2a2d3a', axis: '#5b6172', text: '#c3c2b7', surface: '#12131a' },
};

export function useChartPalette() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const series = isDark ? DARK : LIGHT;
  return {
    isDark,
    series,
    blue: series[0],
    aqua: series[1],
    yellow: series[2],
    red: series[3],
    ...AXIS[isDark ? 'dark' : 'light'],
  };
}
