import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";

interface Props {
  onBack: () => void;
}
export default function ReportPostScreen({ onBack }: Props) {
  const [reason, setReason] = useState("Lừa đảo");
  const reasons = [
    "Lừa đảo",
    "Báo giá sai",
    "Phòng không đúng ảnh",
    "Nội dung không phù hợp",
  ];
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>‹ Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Báo cáo bài đăng</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Điều gì không ổn?</Text>
        <Text style={styles.subtitle}>
          Báo cáo của bạn giúp HubStay giữ cộng đồng an toàn và đáng tin cậy.
        </Text>
        {reasons.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.reason, reason === item && styles.activeReason]}
            onPress={() => setReason(item)}
          >
            <View
              style={[styles.radio, reason === item && styles.activeRadio]}
            />{" "}
            <Text
              style={[
                styles.reasonText,
                reason === item && styles.activeReasonText,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.label}>Ảnh chứng minh</Text>
        <TouchableOpacity style={styles.upload}>
          <Text style={styles.uploadIcon}>＋</Text>
          <Text style={styles.uploadText}>Thêm ảnh hoặc video</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            Alert.alert("Cảm ơn bạn", "Báo cáo đã được gửi để kiểm duyệt.", [
              { text: "Đóng", onPress: onBack },
            ])
          }
        >
          <Text style={styles.buttonText}>Gửi báo cáo</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8F7" },
  header: {
    padding: 17,
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#DCE9E5",
  },
  back: { color: "#20786B", fontWeight: "700" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#183B36",
    fontWeight: "800",
    fontSize: 17,
  },
  content: { padding: 22 },
  title: { color: "#183B36", fontSize: 26, fontWeight: "800" },
  subtitle: {
    color: "#78908B",
    lineHeight: 20,
    marginTop: 7,
    marginBottom: 20,
  },
  reason: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 15,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCE9E5",
  },
  activeReason: { borderColor: "#E77D58", backgroundColor: "#FFF8F5" },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#A2B3AF",
    marginRight: 11,
  },
  activeRadio: { borderWidth: 5, borderColor: "#E77D58" },
  reasonText: { color: "#52726A" },
  activeReasonText: { color: "#A45A35", fontWeight: "800" },
  label: {
    color: "#38564F",
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 9,
  },
  upload: {
    height: 100,
    backgroundColor: "#FFF",
    borderRadius: 13,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#DCE9E5",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadIcon: { color: "#E77D58", fontSize: 28 },
  uploadText: { color: "#78908B", marginTop: 4 },
  button: {
    backgroundColor: "#E77D58",
    borderRadius: 13,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: { color: "#FFF", fontWeight: "800" },
});
