// ダミーの散歩データ（本番では API から取得したデータに置き換える）
import type { Walk } from './types';
export type { Walk } from './types';

export const mockWalks: Walk[] = [
  {
    id: "walk-1",
    startedAt: "2026-09-20T08:00:00+09:00",
    points: [
      { lat: 35.6812, lng: 139.7671 },
      { lat: 35.6820, lng: 139.7680 },
      { lat: 35.6831, lng: 139.7684 },
      { lat: 35.6840, lng: 139.7695 },
      { lat: 35.6848, lng: 139.7710 },
      { lat: 35.6852, lng: 139.7728 },
    ],
  },
  {
    id: "walk-2",
    startedAt: "2026-09-21T17:30:00+09:00",
    points: [
      { lat: 35.6812, lng: 139.7671 },
      { lat: 35.6805, lng: 139.7655 },
      { lat: 35.6798, lng: 139.7640 },
      { lat: 35.6790, lng: 139.7632 },
      { lat: 35.6781, lng: 139.7638 },
      { lat: 35.6776, lng: 139.7652 },
    ],
  },
  {
    id: "walk-3",
    startedAt: "2026-09-22T07:15:00+09:00",
    points: [
      { lat: 35.6848, lng: 139.7710 },
      { lat: 35.6835, lng: 139.7722 },
      { lat: 35.6822, lng: 139.7730 },
      { lat: 35.6810, lng: 139.7725 },
      { lat: 35.6800, lng: 139.7708 },
      { lat: 35.6795, lng: 139.7690 },
    ],
  },
];