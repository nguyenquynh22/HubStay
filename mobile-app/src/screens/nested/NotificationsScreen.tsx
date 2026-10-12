import React, { useCallback, useEffect, useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
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
  deleteAllNotifications,
  deleteNotification,
  deleteSelectedNotifications,
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
  userId: number;
}

export default function NotificationsScreen({ onBack, userId }: Props) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);

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
    if (selecting) {
      setSelectedIds((current) =>
        current.includes(id)
          ? current.filter((selectedId) => selectedId !== id)
          : [...current, id],
      );
      return;
    }
    try {
      await markNotificationRead(userId, id);
      setItems((current) =>
        current.map((item) =>
          item.notification_id === id ? { ...item, is_read: 1 } : item,
        ),
      );
    } catch {
      Alert.alert("Chưa cập nhật được", "Vui lòng thử lại sau.");
    }
  };

  const startSelecting = (notificationId?: number) => {
    setSelecting(true);
    setSelectedIds(notificationId ? [notificationId] : []);
  };

  const stopSelecting = () => {
    setSelecting(false);
    setSelectedIds([]);
  };

  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const toggleSelectAll = () => {
    setSelectedIds(
      allSelected ? [] : items.map((item) => item.notification_id),
    );
  };

  const removeOne = async (id: number) => {
    setDeleting(true);
    try {
      await deleteNotification(id);
      setItems((current) =>
        current.filter((item) => item.notification_id !== id),
      );
      setSelectedIds((current) =>
        current.filter((selectedId) => selectedId !== id),
      );
    } catch {
      Alert.alert("Chưa xóa được", "Vui lòng thử lại sau.");
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteOne = (id: number) => {
    Alert.alert("Xóa thông báo này?", "Bạn sẽ không thể khôi phục thông báo.", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => void removeOne(id),
      },
    ]);
  };

  const openItemMenu = (item: NotificationItem) => {
    Alert.alert(item.title, "Chọn thao tác cho thông báo này.", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Chọn để xóa nhiều",
        onPress: () => startSelecting(item.notification_id),
      },
      {
        text: "Xóa thông báo",
        style: "destructive",
        onPress: () => confirmDeleteOne(item.notification_id),
      },
    ]);
  };

  const removeSelected = async () => {
    const idsToDelete = selectedIds;
    setDeleting(true);
    try {
      await deleteSelectedNotifications(userId, idsToDelete);
      const deletedIds = new Set(idsToDelete);
      setItems((current) =>
        current.filter((item) => !deletedIds.has(item.notification_id)),
      );
      stopSelecting();
    } catch {
      Alert.alert("Chưa xóa được", "Vui lòng thử lại sau.");
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      "Xóa thông báo đã chọn?",
      `Bạn đã chọn ${selectedIds.length} thông báo. Thao tác này không thể hoàn tác.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa đã chọn",
          style: "destructive",
          onPress: () => void removeSelected(),
        },
      ],
    );
  };

  const markAll = async () => {
    try {
      await markNotificationsRead(userId);
      setItems((current) => current.map((item) => ({ ...item, is_read: 1 })));
    } catch {
      Alert.alert("Chưa cập nhật được", "Vui lòng thử lại sau.");
    }
  };

  const deleteAll = async () => {
    try {
      await deleteAllNotifications(userId);
      setItems([]);
      stopSelecting();
    } catch {
      Alert.alert("Chưa xóa được", "Vui lòng thử lại sau.");
    }
  };

  const confirmDeleteAll = () => {
    Alert.alert(
      "Xóa tất cả thông báo?",
      "Thao tác này sẽ xóa vĩnh viễn danh sách thông báo của bạn.",
      [
        { text: "Hủy", style: "cancel" },
        { text: "Xóa tất cả", style: "destructive", onPress: deleteAll },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>‹ Quay lại</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Text style={styles.heading}>Thông báo</Text>
          <TouchableOpacity
            onPress={selecting ? stopSelecting : () => startSelecting()}
            accessibilityRole="button"
            accessibilityLabel={
              selecting ? "Hủy chọn thông báo" : "Chọn nhiều thông báo"
            }
            hitSlop={8}
          >
            <MaterialIcons
              name={selecting ? "close" : "checklist"}
              size={24}
              color="#00685f"
            />
          </TouchableOpacity>
        </View>
        <View style={styles.actions}>
          {selecting ? (
            <>
              <TouchableOpacity
                onPress={toggleSelectAll}
                disabled={items.length === 0}
              >
                <Text
                  style={[
                    styles.actionText,
                    items.length === 0 && styles.disabledAction,
                  ]}
                >
                  {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </Text>
              </TouchableOpacity>
              <Text style={styles.selectedCount}>
                Đã chọn {selectedIds.length}
              </Text>
              <TouchableOpacity
                onPress={confirmDeleteSelected}
                disabled={selectedIds.length === 0 || deleting}
                accessibilityRole="button"
                accessibilityLabel={`Xóa ${selectedIds.length} thông báo đã chọn`}
              >
                <Text
                  style={[
                    styles.deleteText,
                    (selectedIds.length === 0 || deleting) &&
                      styles.disabledAction,
                  ]}
                >
                  Xóa đã chọn
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={markAll} disabled={items.length === 0}>
                <Text
                  style={[
                    styles.actionText,
                    items.length === 0 && styles.disabledAction,
                  ]}
                >
                  Đọc tất cả
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDeleteAll}
                disabled={items.length === 0 || deleting}
                accessibilityRole="button"
                accessibilityLabel="Xóa tất cả thông báo"
              >
                <Text
                  style={[
                    styles.deleteText,
                    items.length === 0 && styles.disabledAction,
                  ]}
                >
                  Xóa tất cả
                </Text>
              </TouchableOpacity>
            </>
          )}
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
              <View
                key={item.notification_id}
                style={[
                  styles.item,
                  !item.is_read && styles.unread,
                  selectedIds.includes(item.notification_id) &&
                    styles.selectedItem,
                ]}
              >
                {selecting && (
                  <TouchableOpacity
                    onPress={() => markOne(item.notification_id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: selectedIds.includes(item.notification_id),
                    }}
                    accessibilityLabel={`Chọn thông báo ${item.title}`}
                    style={styles.selectionControl}
                  >
                    <MaterialIcons
                      name={
                        selectedIds.includes(item.notification_id)
                          ? "check-box"
                          : "check-box-outline-blank"
                      }
                      size={22}
                      color="#00685f"
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => markOne(item.notification_id)}
                  style={styles.itemContent}
                  accessibilityRole="button"
                  accessibilityLabel={
                    selecting
                      ? `Chọn thông báo ${item.title}`
                      : `Đọc thông báo ${item.title}`
                  }
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
                {!selecting && (
                  <TouchableOpacity
                    onPress={() => openItemMenu(item)}
                    disabled={deleting}
                    accessibilityRole="button"
                    accessibilityLabel={`Thao tác với thông báo ${item.title}`}
                    hitSlop={8}
                    style={styles.moreButton}
                  >
                    <MaterialIcons name="more-vert" size={22} color="#475569" />
                  </TouchableOpacity>
                )}
              </View>
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
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 12,
  },
  actionText: { color: "#00685f", fontWeight: "600", fontSize: 12 },
  deleteText: { color: "#B42318", fontWeight: "600", fontSize: 12 },
  selectedCount: { color: "#475569", fontSize: 12, fontWeight: "600" },
  disabledAction: { color: "#94A3B8" },
  content: { padding: 16 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    marginBottom: 10,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
  },
  selectedItem: { backgroundColor: "#E8F4F1" },
  itemContent: { flex: 1 },
  selectionControl: { paddingRight: 10 },
  moreButton: { paddingLeft: 8, alignSelf: "flex-start" },
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
