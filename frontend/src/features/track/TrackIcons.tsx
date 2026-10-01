// 足跡画面のボタン用アイコン（react-native-svg で描画。24x24 の座標系）
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

type IconProps = { color: string; size?: number };

/** 左右の足跡 */
export function FootprintsIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Ellipse cx={7} cy={14} rx={3.2} ry={4.6} fill={color} transform="rotate(-12 7 14)" />
      <Circle cx={4.6} cy={7.6} r={1.1} fill={color} />
      <Circle cx={6.8} cy={6.9} r={1.1} fill={color} />
      <Circle cx={9} cy={7.4} r={1.1} fill={color} />
      <Ellipse cx={17} cy={10} rx={3.2} ry={4.6} fill={color} transform="rotate(12 17 10)" />
      <Circle cx={15} cy={3.4} r={1.1} fill={color} />
      <Circle cx={17.2} cy={2.9} r={1.1} fill={color} />
      <Circle cx={19.4} cy={3.6} r={1.1} fill={color} />
    </Svg>
  );
}

/** 地図のピン（地図上のマーカーと同じしずく形） */
export function PinIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 22 C10 18 5.5 14.5 5.5 9.5 A6.5 6.5 0 1 1 18.5 9.5 C18.5 14.5 14 18 12 22 Z"
        fill={color}
      />
      <Circle cx={12} cy={9.5} r={2.5} fill="#FFFFFF" />
    </Svg>
  );
}

/** 一覧（3本線） */
export function ListIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 6h16M4 12h16M4 18h16" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

/** アカウント（人のシルエット） */
export function AccountIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={8} r={4} fill={color} />
      <Path d="M4 21 C4 16.5 7.6 14 12 14 C16.4 14 20 16.5 20 21 Z" fill={color} />
    </Svg>
  );
}
