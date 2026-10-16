import Svg, { Circle, Path, Rect } from 'react-native-svg';

const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function Trash({ size = 16, color = '#b3372f' }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} color={color}>
      <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" {...line} />
    </Svg>
  );
}

export function CalendarIcon({ size = 24, color = '#ffd436' }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} color={color}>
      <Rect x="3" y="5" width="18" height="16" rx="2" {...line} />
      <Path d="M16 3v4M8 3v4M3 10h18" {...line} />
    </Svg>
  );
}

export function SignOutIcon({ size = 18, color = '#b3372f' }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} color={color}>
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" {...line} />
    </Svg>
  );
}

const outline = { stroke: 'rgba(9,39,94,.35)', strokeWidth: 1.5 };

export function PowderIcon({ size = 52 }) {
  return (
    <Svg viewBox="0 0 48 48" width={size} height={size}>
      <Path d="M10 15h28v26a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3z" fill="#fff" {...outline} />
      <Path d="M10 15l4-8h20l4 8z" fill="#ffd436" {...outline} strokeLinejoin="round" />
      <Rect x="14" y="22" width="20" height="14" rx="2" fill="#1762c5" />
      <Circle cx="20" cy="27" r="2.5" fill="#fff" />
      <Circle cx="27" cy="31" r="3.2" fill="#fff" opacity={0.85} />
      <Circle cx="29" cy="25" r="1.6" fill="#fff" opacity={0.8} />
    </Svg>
  );
}
