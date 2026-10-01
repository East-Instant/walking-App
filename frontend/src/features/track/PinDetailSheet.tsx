// 地図のピンをタップしたときに出す「その場所の記録」シート（名前・日付・メモ・写真）
import { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Photo } from "../../../photos/api";
import { PrivatePhoto } from "../../../photos/PrivatePhoto";
import { PhotoSessionBoundary } from "../../../photos/session";
import TrackActionButton from "./TrackActionButton";
import { PinIcon } from "./TrackIcons";
import { usePinDetail } from "./usePinDetail";
import { PIN_COLOR } from "./WalkCanvas";

type Props = {
  token: string;
  pinId: string;
  canOpenList: boolean; // 散歩の記録中は画面を移動できないので false
  onOpenList: () => void;
  onClose: () => void;
};

export default function PinDetailSheet({ token, pinId, canOpenList, onOpenList, onClose }: Props) {
  const detail = usePinDetail(token, pinId);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [expired, setExpired] = useState(false);
  // 写真の読み込みで認証が切れても、散歩中の画面からログアウトさせない
  const session = useMemo(() => ({ onExpired: () => setExpired(true), suspended: false }), []);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <PhotoSessionBoundary.Provider value={session}>
        <View style={styles.backdrop}>
          <Pressable style={styles.dismiss} accessibilityRole="button" accessibilityLabel="記録を閉じる" onPress={onClose} />
          <View style={styles.sheet} accessibilityViewIsModal>
            <View style={styles.handle} />
            <ScrollView contentContainerStyle={styles.content}>
              {detail.loading ? (
                <ActivityIndicator color={PIN_COLOR} />
              ) : detail.error || !detail.pin ? (
                <>
                  <Text style={styles.error}>{detail.error || "記録を読み込めませんでした。"}</Text>
                  <TrackActionButton title="再読み込み" backgroundColor="#E3E3E3" textColor="#000000" onPress={detail.reload} />
                </>
              ) : (
                <>
                  <View style={styles.header}>
                    <PinIcon color={PIN_COLOR} size={28} />
                    <View style={styles.headerText}>
                      <Text accessibilityRole="header" style={styles.title}>{detail.pin.title}</Text>
                      <Text style={styles.date}>{formatDate(detail.pin.created_at)}</Text>
                    </View>
                  </View>
                  {!!detail.pin.memo && <Text style={styles.memo}>{detail.pin.memo}</Text>}
                  {expired && <Text style={styles.error}>ログインの有効期限が切れたため、写真を表示できません。</Text>}
                  {selected ? (
                    <>
                      <PrivatePhoto key={selected.id} photo={selected} enlarged />
                      <TrackActionButton compact title="写真一覧に戻る" backgroundColor="#E3E3E3" textColor="#000000" onPress={() => setSelected(null)} />
                    </>
                  ) : detail.photos.length === 0 ? (
                    <Text style={styles.empty}>この場所の写真はまだありません</Text>
                  ) : (
                    <View style={styles.grid}>
                      {detail.photos.map((photo) => (
                        <Pressable
                          key={photo.id}
                          accessibilityRole="button"
                          accessibilityLabel="写真を拡大表示"
                          style={styles.tile}
                          onPress={() => setSelected(photo)}
                        >
                          <PrivatePhoto photo={photo} />
                        </Pressable>
                      ))}
                    </View>
                  )}
                </>
              )}
              <View style={styles.row}>
                <TrackActionButton
                  compact
                  title="記録一覧で編集"
                  backgroundColor="#C8963E"
                  textColor="#1F1A10"
                  disabled={!canOpenList || !detail.pin}
                  onPress={onOpenList}
                />
                <TrackActionButton compact title="閉じる" backgroundColor="#D4D4D4" textColor="#000000" onPress={onClose} />
              </View>
              {!canOpenList && <Text style={styles.note}>写真の追加・削除は、散歩を終えて保存したあとに記録一覧から行えます。</Text>}
            </ScrollView>
          </View>
        </View>
      </PhotoSessionBoundary.Provider>
    </Modal>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.45)", justifyContent: "flex-end" },
  dismiss: { flex: 1 },
  sheet: {
    maxHeight: "80%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#CCCCCC" },
  content: { padding: 20, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: "700", color: "#111" },
  date: { fontSize: 13, color: "#666" },
  memo: { fontSize: 15, color: "#222", lineHeight: 22 },
  empty: { fontSize: 14, color: "#666", textAlign: "center", paddingVertical: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { width: "31%" },
  row: { flexDirection: "row", gap: 8 },
  error: { color: "#A12A26", textAlign: "center" },
  note: { fontSize: 12, color: "#555", textAlign: "center" },
});
