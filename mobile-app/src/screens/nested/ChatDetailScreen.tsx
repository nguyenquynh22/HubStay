import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
} from "react-native";

interface Props {
  onBack: () => void;
  post?: { title?: string } | null;
}
export default function ChatDetailScreen({ onBack, post }: Props) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: "1", text: "Chào bạn, mình quan tâm phòng này.", mine: false },
    { id: "2", text: "Chào bạn! Bạn muốn xem phòng lúc nào?", mine: true },
  ]);
  const send = () => {
    if (!message.trim()) return;
    setMessages((current) => [
      ...current,
      { id: String(Date.now()), text: message.trim(), mine: true },
    ]);
    setMessage("");
  };
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.name}>Nguyễn Văn A</Text>
          <Text style={styles.online}>● Đang hoạt động</Text>
        </View>
      </View>
      <View style={styles.post}>
        <Text style={styles.postLabel}>ĐANG TRAO ĐỔI VỀ</Text>
        <Text style={styles.postTitle} numberOfLines={1}>
          {post?.title || "Phòng trọ khép kín gần trường"}
        </Text>
      </View>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messages}
        renderItem={({ item }) => (
          <View
            style={[styles.bubble, item.mine ? styles.mine : styles.theirs]}
          >
            <Text style={[styles.bubbleText, item.mine && styles.mineText]}>
              {item.text}
            </Text>
          </View>
        )}
      />
      <View style={styles.composer}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor="#A2B3AF"
          style={styles.input}
        />
        <TouchableOpacity onPress={send} style={styles.send}>
          <Text style={styles.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8F7" },
  header: {
    padding: 14,
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#DCE9E5",
  },
  back: { fontSize: 32, color: "#20786B" },
  headerCopy: { marginLeft: 12 },
  name: { color: "#183B36", fontSize: 16, fontWeight: "800" },
  online: { color: "#5C8A80", fontSize: 11, marginTop: 3 },
  post: {
    margin: 14,
    backgroundColor: "#E4F2EE",
    borderRadius: 12,
    padding: 12,
  },
  postLabel: { color: "#5C8A80", fontSize: 10, fontWeight: "800" },
  postTitle: { color: "#287466", fontWeight: "700", marginTop: 5 },
  messages: { padding: 15, flexGrow: 1, justifyContent: "flex-end" },
  bubble: { maxWidth: "78%", padding: 12, borderRadius: 15, marginTop: 9 },
  theirs: {
    backgroundColor: "#FFF",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 3,
  },
  mine: {
    backgroundColor: "#20786B",
    alignSelf: "flex-end",
    borderBottomRightRadius: 3,
  },
  bubbleText: { color: "#38564F", lineHeight: 19 },
  mineText: { color: "#FFF" },
  composer: {
    backgroundColor: "#FFF",
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#DCE9E5",
  },
  input: {
    flex: 1,
    backgroundColor: "#F5F8F7",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: "#183B36",
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 8,
    backgroundColor: "#E77D58",
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: { color: "#FFF", fontSize: 22, fontWeight: "800" },
});
