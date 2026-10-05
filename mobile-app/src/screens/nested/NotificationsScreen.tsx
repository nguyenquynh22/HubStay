import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getNotifications,
  markNotificationRead,
  markNotificationsRead,
} from "../../services/api";

interface NotificationItem {
  notification_id: number;
  type: string;
  title: string;
  body: string;
  is_read: number;
  created_at: string;
}

interface Props {
  onBack?: () => void;
  userId?: number;
}

export default function NotificationsScreen({ onBack, userId = 1 }: Props) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const response = await getNotifications(userId);
    setItems(response.data || []);
  }, [userId]);

  useEffect(() => {
    refresh()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refresh]);

  const markOne = async (id: number) => {
    await markNotificationRead(userId, id);
    setItems((current) =>
      current.map((item) =>
        item.notification_id === id ? { ...item, is_read: 1 } : item,
      ),
    );
  };

  const markAll = async () => {
    await markNotificationsRead(userId);
    setItems((current) => current.map((item) => ({ ...item, is_read: 1 })));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>‹ Quay lại</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Text style={styles.heading}>Thông báo</Text>
          <TouchableOpacity onPress={markAll}>
            <Text style={styles.markAll}>Đọc tất cả</Text>
          </TouchableOpacity>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} color="#00685f" />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {items.length === 0 ? (
            <Text style={styles.empty}>Chưa có thông báo</Text>
          ) : (
            items.map((item) => (
              <TouchableOpacity
                key={item.notification_id}
                onPress={() => markOne(item.notification_id)}
                style={[styles.item, !item.is_read && styles.unread]}
              >
                <View style={styles.itemHeading}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {!item.is_read && <View style={styles.dot} />}
                </View>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.date}>
                  {new Date(item.created_at).toLocaleString("vi-VN")}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  back: { color: "#00685f", fontWeight: "600" },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  heading: { color: "#1E293B", fontSize: 18, fontWeight: "700" },
  markAll: { color: "#00685f", fontWeight: "600", fontSize: 12 },
  content: { padding: 16 },
  item: {
    padding: 15,
    marginBottom: 10,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
  },
  unread: { borderLeftWidth: 3, borderLeftColor: "#00685f" },
  itemHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemTitle: { color: "#1E293B", fontSize: 14, fontWeight: "700", flex: 1 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00685f",
    marginLeft: 10,
  },
  body: { color: "#475569", marginTop: 7, lineHeight: 20 },
  date: { color: "#94A3B8", fontSize: 11, marginTop: 8 },
  empty: { textAlign: "center", color: "#64748B", marginTop: 30 },
});
