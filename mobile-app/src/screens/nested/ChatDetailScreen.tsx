import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { io, Socket } from "socket.io-client";
import api from "../../api/axiosClient";
import { getMessages } from "../../services/api";

interface Props {
  onBack: () => void;
  conversation: any;
  userId: number;
  onBookAppointment: () => void;
}

export default function ChatDetailScreen({
  onBack,
  conversation,
  userId,
  onBookAppointment,
}: Props) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<FlatList<any> | null>(null);

  useEffect(() => {
    let active = true;
    const base = String(
      api.defaults.baseURL || "http://localhost:5000/api",
    ).replace(/\/api\/?$/, "");
    const socket = io(base, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      setConnected(true);
      setConnectionError(false);
      socket.emit(
        "join_conversation",
        { conversation_id: conversation._id, user_id: userId },
        async (result: any) => {
          if (!active) return;
          if (!result?.success) {
            setConnectionError(true);
            setLoading(false);
            return;
          }
          try {
            const history = await getMessages(conversation._id, userId);
            if (active)
              setMessages((current) => [
                ...new Map(
                  [...((history.data || []) as any[]), ...current].map(
                    (item) => [item._id, item],
                  ),
                ).values(),
              ]);
          } catch {
            if (active) setConnectionError(true);
          } finally {
            if (active) setLoading(false);
          }
        },
      );
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => {
      setConnected(false);
      setConnectionError(true);
      setLoading(false);
    });
    socket.on("receive_message", (incoming: any) =>
      setMessages((current) =>
        current.some((item) => item._id === incoming._id)
          ? current
          : [...current, incoming],
      ),
    );
    return () => {
      active = false;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversation._id, userId]);

  const send = () => {
    const text = message.trim();
    if (!text || !socketRef.current?.connected) return;
    socketRef.current.emit(
      "send_message",
      { conversation_id: conversation._id, text },
      (result: any) => {
        if (result?.success) setMessage("");
        else setConnectionError(true);
      },
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.name}>
            {conversation.peer_name || "Người dùng"}
          </Text>
          <Text style={styles.online}>
            {connected
              ? `Trao đổi về: ${conversation.post_title}`
              : "Đang kết nối lại…"}
          </Text>
        </View>
        {Number(conversation.tenant_id) === userId &&
          conversation.enable_booking && (
            <TouchableOpacity
              onPress={onBookAppointment}
              style={styles.bookButton}
            >
              <Text style={styles.bookButtonText}>Đặt lịch</Text>
            </TouchableOpacity>
          )}
      </View>
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#00685f" />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item._id}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          contentContainerStyle={styles.messages}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {connectionError
                ? "Chưa tải được tin nhắn. Ứng dụng sẽ thử kết nối lại."
                : "Bắt đầu trao đổi về giá và chi phí dịch vụ."}
            </Text>
          }
          renderItem={({ item }) => {
            const mine = Number(item.sender_id) === userId;
            return (
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={[styles.bubbleText, mine && styles.mineText]}>
                  {item.text}
                </Text>
              </View>
            );
          }}
        />
      )}
      {connectionError && !connected && (
        <Text style={styles.connectionNote}>
          Chưa kết nối được máy chủ. Ứng dụng sẽ tự thử kết nối lại.
        </Text>
      )}
      <View style={styles.composer}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor="#9AAAB0"
          style={styles.input}
          maxLength={4000}
          multiline
        />
        <TouchableOpacity
          disabled={!connected || !message.trim()}
          onPress={send}
          style={[
            styles.send,
            (!connected || !message.trim()) && styles.sendDisabled,
          ]}
        >
          <Text style={styles.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FA" },
  header: {
    padding: 14,
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#DCE5E8",
  },
  back: { fontSize: 32, color: "#547A8A" },
  headerCopy: { marginLeft: 12, flex: 1 },
  name: { color: "#263B43", fontSize: 16, fontWeight: "800" },
  online: { color: "#6B8FA3", fontSize: 11, marginTop: 3 },
  bookButton: {
    backgroundColor: "#00685f",
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  bookButtonText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  messages: { padding: 15, flexGrow: 1, justifyContent: "flex-end" },
  bubble: { maxWidth: "78%", padding: 12, borderRadius: 15, marginTop: 9 },
  theirs: {
    backgroundColor: "#FFF",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 3,
  },
  mine: {
    backgroundColor: "#6B8FA3",
    alignSelf: "flex-end",
    borderBottomRightRadius: 3,
  },
  bubbleText: { color: "#445B63", lineHeight: 19 },
  mineText: { color: "#FFF" },
  empty: { textAlign: "center", color: "#71858C", padding: 25 },
  connectionNote: {
    textAlign: "center",
    color: "#9A5B18",
    backgroundColor: "#FFF7E8",
    padding: 8,
    fontSize: 12,
  },
  composer: {
    backgroundColor: "#FFF",
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#DCE5E8",
  },
  input: {
    flex: 1,
    backgroundColor: "#F7F9FA",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: "#263B43",
    maxHeight: 100,
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
  sendDisabled: { opacity: 0.45 },
  sendText: { color: "#FFF", fontSize: 22, fontWeight: "800" },
});
