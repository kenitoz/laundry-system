import Svg, { Path } from 'react-native-svg';

const stroke = { stroke: 'rgba(9,39,94,.35)', strokeWidth: 1.5, strokeLinejoin: 'round' };

// Shirt, shorts and sock drawings shared by the landing game and save animation.
export default function Wear({ type, color, size }) {
  return (
    <Svg viewBox="0 0 48 48" width={size} height={size}>
      {type === 'shirt' && <Path d="M17 6l-11 6 4 10 5-2v22h18V20l5 2 4-10-11-6c-1 3.5-3.6 5-7 5s-6-1.5-7-5z" fill={color} {...stroke} />}
      {type === 'shorts' && <><Path d="M10 8h28l3 32H28l-4-16-4 16H7z" fill={color} {...stroke} /><Path d="M10 14h28" {...stroke} /></>}
      {type === 'sock' && <><Path d="M18 4h12v22l8 8c3 3 1 9-4 9h-6c-4 0-6-2-8-5l-4-6c-1-2 2-3 2-5z" fill={color} {...stroke} /><Path d="M18 10h12" {...stroke} /></>}
    </Svg>
  );
}
