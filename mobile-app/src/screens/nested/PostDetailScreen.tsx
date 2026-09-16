import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Post } from "../../types/mockData";

interface Props {
  post: Post | null;
  onBack: () => void;
  onReport: () => void;
  onOpenChat: () => void;
}
export default function PostDetailScreen({
  post,
  onBack,
  onReport,
  onOpenChat,
}: Props) {
  if (!post) return null;
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết bài đăng</Text>
        <Text style={styles.headerAction}>♡</Text>
      </View>
      <ScrollView>
        <Image source={{ uri: post.imageUrl }} style={styles.hero} />
        <View style={styles.content}>
          <View style={styles.tagRow}>
            <Text style={styles.tag}>{post.badge}</Text>
            {post.isVerifiedHost && (
              <Text style={styles.verified}>✓ Uy tín</Text>
            )}
          </View>
          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.price}>{post.price}</Text>
          <Text style={styles.address}>⌖ {post.address}</Text>
          <View style={styles.rule} />
          <Text style={styles.sectionTitle}>Thông tin phòng</Text>
          <View style={styles.features}>
            <Text style={styles.feature}>⌂ Nội thất cơ bản</Text>
            <Text style={styles.feature}>◉ Wifi miễn phí</Text>
            <Text style={styles.feature}>▣ Chỗ để xe</Text>
          </View>
          <View style={styles.host}>
            <View style={styles.hostAvatar}>
              <Text style={styles.hostInitial}>H</Text>
            </View>
            <View style={styles.hostCopy}>
              <Text style={styles.hostName}>
                Chủ trọ HubStay <Text style={styles.check}>✓</Text>
              </Text>
              <Text style={styles.hostSub}>Đã tham gia cộng đồng 2 năm</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondary} onPress={onOpenChat}>
              <Text style={styles.secondaryText}>Nhắn tin</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primary}
              onPress={() =>
                Alert.alert("Gọi điện", "Đang mở ứng dụng điện thoại...")
              }
            >
              <Text style={styles.primaryText}>Gọi ngay</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={onReport}>
            <Text style={styles.report}>Báo cáo bài đăng</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8F7" },
  header: {
    height: 60,
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderColor: "#E2ECE9",
  },
  back: { fontSize: 34, color: "#20786B" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#183B36",
    fontSize: 17,
    fontWeight: "800",
  },
  headerAction: { fontSize: 27, color: "#E77D58" },
  hero: { width: "100%", height: 235, backgroundColor: "#D9EFE9" },
  content: { padding: 18 },
  tagRow: { flexDirection: "row", gap: 7 },
  tag: {
    color: "#287466",
    backgroundColor: "#E4F2EE",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: "800",
  },
  verified: {
    color: "#A45A35",
    backgroundColor: "#FCE8DE",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: "800",
  },
  title: {
    color: "#183B36",
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "800",
    marginTop: 12,
  },
  price: { color: "#20786B", fontSize: 20, fontWeight: "800", marginTop: 10 },
  address: { color: "#78908B", marginTop: 7 },
  rule: { height: 1, backgroundColor: "#DCE9E5", marginVertical: 20 },
  sectionTitle: { color: "#183B36", fontSize: 16, fontWeight: "800" },
  features: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 12 },
  feature: {
    color: "#52726A",
    backgroundColor: "#FFF",
    padding: 10,
    borderRadius: 9,
  },
  host: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  hostAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FCE8DE",
    alignItems: "center",
    justifyContent: "center",
  },
  hostInitial: { color: "#A45A35", fontWeight: "800", fontSize: 18 },
  hostCopy: { marginLeft: 11 },
  hostName: { color: "#183B36", fontWeight: "800" },
  check: { color: "#20786B" },
  hostSub: { color: "#78908B", fontSize: 12, marginTop: 4 },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  secondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#20786B",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryText: { color: "#20786B", fontWeight: "800" },
  primary: {
    flex: 1,
    backgroundColor: "#20786B",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryText: { color: "#FFF", fontWeight: "800" },
  report: {
    color: "#A45A35",
    textAlign: "center",
    marginVertical: 20,
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
