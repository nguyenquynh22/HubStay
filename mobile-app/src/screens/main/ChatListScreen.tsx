import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";

interface Props {
  onOpenChat: () => void;
}
const conversations = [
  {
    id: "1",
    name: "Nguyễn Văn A",
    preview: "Mình muốn hẹn xem phòng chiều nay...",
    time: "10:24",
    unread: 2,
  },
  {
    id: "2",
    name: "Trần Thị B",
    preview: "Phòng còn chỗ để xe không ạ?",
    time: "Hôm qua",
    unread: 0,
  },
];

export default function ChatListScreen({ onOpenChat }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>HỘP THƯ</Text>
        <Text style={styles.title}>Tin nhắn</Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={onOpenChat}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
            </View>
            <View style={styles.copy}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.preview} numberOfLines={1}>
                {item.preview}
              </Text>
            </View>
            <View style={styles.meta}>
              <Text style={styles.time}>{item.time}</Text>
              {item.unread > 0 && (
                <View style={styles.unread}>
                  <Text style={styles.unreadText}>{item.unread}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8F7" },
  header: { padding: 22, backgroundColor: "#FFFFFF" },
  kicker: {
    color: "#5C8A80",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  title: { color: "#183B36", fontSize: 28, fontWeight: "800", marginTop: 5 },
  list: { padding: 14 },
  row: {
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#D9EFE9",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#20786B", fontSize: 19, fontWeight: "800" },
  copy: { flex: 1, marginLeft: 12 },
  name: { color: "#183B36", fontWeight: "800", fontSize: 15 },
  preview: { color: "#78908B", marginTop: 5 },
  meta: { alignItems: "flex-end", gap: 7 },
  time: { color: "#A2B3AF", fontSize: 11 },
  unread: {
    backgroundColor: "#E77D58",
    borderRadius: 10,
    minWidth: 20,
    padding: 3,
    alignItems: "center",
  },
  unreadText: { color: "#FFF", fontSize: 11, fontWeight: "800" },
});
