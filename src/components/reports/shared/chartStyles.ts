// Shared chart styling constants for all report components

export const CHART_GRID_PROPS = {
  vertical: false,
  strokeDasharray: "3 3",
  stroke: "hsl(var(--border))",
  strokeOpacity: 0.5,
} as const;

export const CHART_AXIS_PROPS = {
  axisLine: false,
  tickLine: false,
  tick: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
} as const;

export const CHART_X_AXIS_PROPS = {
  ...CHART_AXIS_PROPS,
  dy: 8,
} as const;

export const CHART_Y_AXIS_PROPS = {
  ...CHART_AXIS_PROPS,
  width: 50,
} as const;

export const CHART_BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];

export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: '8px',
    border: '1px solid hsl(var(--border))',
    backgroundColor: 'hsl(var(--background))',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    fontSize: '13px',
  },
} as const;

export const CHART_CURSOR = { fill: "hsl(var(--muted))", opacity: 0.3 };

// Palette for donut/pie charts
export const CHART_COLORS = {
  green: [
    "hsl(142, 71%, 45%)",
    "hsl(142, 60%, 55%)",
    "hsl(160, 60%, 45%)",
    "hsl(170, 55%, 50%)",
    "hsl(152, 50%, 60%)",
  ],
  red: [
    "hsl(0, 72%, 51%)",
    "hsl(15, 70%, 55%)",
    "hsl(30, 65%, 50%)",
    "hsl(350, 60%, 55%)",
    "hsl(10, 55%, 60%)",
  ],
  blue: [
    "hsl(220, 70%, 50%)",
    "hsl(200, 65%, 55%)",
    "hsl(240, 60%, 55%)",
    "hsl(210, 55%, 60%)",
    "hsl(230, 50%, 60%)",
  ],
  mixed: [
    "hsl(142, 71%, 45%)",
    "hsl(220, 70%, 50%)",
    "hsl(30, 80%, 55%)",
    "hsl(280, 60%, 55%)",
    "hsl(0, 72%, 51%)",
    "hsl(170, 55%, 50%)",
  ],
  status: {
    active: "hsl(142, 71%, 45%)",
    sold: "hsl(220, 70%, 50%)",
    dead: "hsl(0, 72%, 51%)",
  },
};

// Donut chart common props
export const DONUT_PROPS = {
  innerRadius: 55,
  outerRadius: 90,
  paddingAngle: 3,
  strokeWidth: 0,
} as const;

// Specific bar colors
export const BAR_COLORS = {
  primary: "hsl(142, 71%, 45%)",
  secondary: "hsl(220, 70%, 50%)",
  tertiary: "hsl(280, 60%, 55%)",
  danger: "hsl(0, 72%, 51%)",
  warning: "hsl(30, 80%, 55%)",
};
