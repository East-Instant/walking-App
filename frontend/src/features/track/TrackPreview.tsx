// 軌跡担当の確認用画面：「開始」を押すと、歩いた軌跡がリアルタイムで描かれる
import { useMemo, useState } from 'react';
import { Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import ZoomableWalkCanvas from './ZoomableWalkCanvas';
import { mockWalks, type Walk } from './mockWalks';
import { useLiveWalk } from './useLiveWalk';

export default function TrackPreview() {
  const [isWalking, setIsWalking] = useState(false);
  const [startedAt] = useState(() => new Date().toISOString());
  const { points, current } = useLiveWalk(isWalking);

  // 過去の散歩（今はダミー）＋ 今歩いている散歩 を同じキャンバスに重ねる
  const walks = useMemo<Walk[]>(
    () => (points.length > 0 ? [...mockWalks, { id: 'live', startedAt, points }] : mockWalks),
    [points, startedAt]
  );

  return (
    <SafeAreaView style={styles.root}>
      <ZoomableWalkCanvas walks={walks} current={current} />
      <View style={styles.panel}>
        <Text style={styles.status}>
          {isWalking ? `記録中：${points.length} 点` : '停止中'}
        </Text>
        <Button
          title={isWalking ? '散歩を終える' : '散歩を始める'}
          onPress={() => setIsWalking((v) => !v)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  panel: { padding: 16, gap: 8, alignItems: 'center' },
  status: { fontSize: 14 },
});
