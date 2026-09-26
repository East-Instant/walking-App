import { computeBounds, createProjector, toPathD } from "./project";
import { mockWalks } from "./mockWalks";
import { applyViewport, DEFAULT_VIEWPORT, MAX_ZOOM, panBy, zoomAt } from "./viewport";
const all = mockWalks.flatMap(w => w.points);
const b = computeBounds(all);
console.log("bounds:", b);
const W = 360, H = 640;
const project = createProjector(b, W, H);
let ok = true;
for (const p of all) { const {x,y} = project(p); if (x<0||x>W||y<0||y>H||!isFinite(x)||!isFinite(y)) ok=false; }
console.log("全点が画面内:", ok);
console.log("北端→y小:", project({lat:b.maxLat,lng:b.minLng}).y < project({lat:b.minLat,lng:b.minLng}).y);
console.log("walk-1 d:", toPathD(mockWalks[0].points, project));

// ズーム：ピンチ中心の下にある地点は拡大後も同じ位置に残る
const focal = { x: 100, y: 200 };
const v1 = zoomAt(panBy(DEFAULT_VIEWPORT, 30, -10), 1, focal, W, H);
const v2 = zoomAt(v1, 3, focal, W, H);
const before = applyViewport(focal, DEFAULT_VIEWPORT, W, H);
const under = { x: before.x - v1.panX, y: before.y - v1.panY }; // v1 で focal に映る元の点
const a1 = applyViewport(under, v1, W, H), a2 = applyViewport(under, v2, W, H);
console.log("ズーム中心が不動:", Math.abs(a1.x - a2.x) < 1e-9 && Math.abs(a1.y - a2.y) < 1e-9);
console.log("倍率の上限で止まる:", zoomAt(DEFAULT_VIEWPORT, 1000, focal, W, H).zoom === MAX_ZOOM);