import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getConversations } from "../../services/api";

interface Props { onOpenChat: (conversation: any) => void; userId: number; }

export default function ChatListScreen({ onOpenChat, userId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await getConversations(userId);
      setRows(result.data || []);
      setError(false);
    } catch (e) {
      console.error("Unable to load conversations", e);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  return <View style={styles.container}>
    <View style={styles.header}><Text style={styles.kicker}>HỘP THƯ</Text><Text style={styles.title}>Tin nhắn</Text></View>
    {loading ? <ActivityIndicator style={{ marginTop: 28 }} color="#00685f" /> : <FlatList
      data={rows}
      keyExtractor={(item) => item._id}
      onRefresh={() => load(true)}
      refreshing={refreshing}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<View style={styles.emptyWrap}><Text style={styles.empty}>{error ? "Không tải được hội thoại. Kiểm tra kết nối rồi thử lại." : "Chưa có cuộc trò chuyện. Mở bài đăng và nhấn Nhắn tin để bắt đầu."}</Text>{error && <TouchableOpacity onPress={() => load()}><Text style={styles.retry}>Thử lại</Text></TouchableOpacity>}</View>}
      renderItem={({ item }) => <TouchableOpacity style={styles.row} onPress={() => onOpenChat(item)}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{String(item.peer_name || "U").charAt(0)}</Text></View>
        <View style={styles.copy}><Text style={styles.name}>{item.peer_name}</Text><Text style={styles.post} numberOfLines={1}>{item.post_title}</Text><Text style={styles.preview} numberOfLines={1}>{item.last_message || "Bắt đầu trao đổi về bài đăng này"}</Text></View>
        <Text style={styles.time}>{item.last_message_at ? new Date(item.last_message_at).toLocaleDateString("vi-VN") : ""}</Text>
      </TouchableOpacity>}
    />}
  </View>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: "#F7F9FA" }, header: { padding: 22, backgroundColor: "#FFF" }, kicker: { color: "#6B8FA3", fontSize: 11, fontWeight: "700", letterSpacing: 1 }, title: { color: "#263B43", fontSize: 28, fontWeight: "800", marginTop: 5 }, list: { padding: 14, flexGrow: 1 }, row: { backgroundColor: "#FFF", padding: 14, borderRadius: 16, marginBottom: 10, flexDirection: "row", alignItems: "center" }, avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#DDE9EE", alignItems: "center", justifyContent: "center" }, avatarText: { color: "#547A8A", fontSize: 19, fontWeight: "800" }, copy: { flex: 1, marginLeft: 12 }, name: { color: "#263B43", fontWeight: "800", fontSize: 15 }, post: { color: "#547A8A", marginTop: 3, fontSize: 12 }, preview: { color: "#71858C", marginTop: 4 }, time: { color: "#9AAAB0", fontSize: 11 }, emptyWrap: { alignItems: "center", padding: 24 }, empty: { textAlign: "center", color: "#71858C", lineHeight: 21 }, retry: { color: "#00685f", fontWeight: "700", marginTop: 10 } });
