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
export default function IdentityVerificationScreen({ onBack }: Props) {
  const [type, setType] = useState("Sinh viên");
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>‹ Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác thực hồ sơ</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Nhận tích xanh uy tín</Text>
        <Text style={styles.subtitle}>
          Hồ sơ xác thực giúp bài đăng được ưu tiên và tạo niềm tin với cộng
          đồng.
        </Text>
        <Text style={styles.label}>Loại tài khoản</Text>
        <View style={styles.types}>
          {["Sinh viên", "Người đi làm", "Chủ trọ"].map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.type, type === item && styles.activeType]}
              onPress={() => setType(item)}
            >
              <Text
                style={[
                  styles.typeText,
                  type === item && styles.activeTypeText,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Tài liệu cần tải lên</Text>
        {["Mặt trước giấy tờ", "Mặt sau giấy tờ"].map((item) => (
          <TouchableOpacity style={styles.upload} key={item}>
            <Text style={styles.uploadIcon}>＋</Text>
            <View>
              <Text style={styles.uploadTitle}>{item}</Text>
              <Text style={styles.uploadSub}>JPG, PNG tối đa 10MB</Text>
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            Alert.alert(
              "Đã gửi hồ sơ",
              "HubStay sẽ phản hồi trong vòng 24 giờ.",
            )
          }
        >
          <Text style={styles.buttonText}>Gửi hồ sơ xác thực</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FA" },
  header: {
    padding: 17,
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#DCE5E8",
  },
  back: { color: "#547A8A", fontWeight: "700" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#263B43",
    fontWeight: "800",
    fontSize: 17,
  },
  content: { padding: 22 },
  title: { color: "#263B43", fontSize: 26, fontWeight: "800" },
  subtitle: {
    color: "#71858C",
    lineHeight: 20,
    marginTop: 7,
    marginBottom: 22,
  },
  label: {
    color: "#445B63",
    fontWeight: "800",
    marginBottom: 9,
    marginTop: 12,
  },
  types: { flexDirection: "row", gap: 8 },
  type: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DCE5E8",
    padding: 11,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
  },
  activeType: { backgroundColor: "#E8F0F3", borderColor: "#6B8FA3" },
  typeText: { color: "#71858C", fontSize: 12 },
  activeTypeText: { color: "#547A8A", fontWeight: "800" },
  upload: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DCE5E8",
    borderStyle: "dashed",
    borderRadius: 13,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  uploadIcon: { color: "#E77D58", fontSize: 25, marginRight: 12 },
  uploadTitle: { color: "#263B43", fontWeight: "800" },
  uploadSub: { color: "#9AAAB0", fontSize: 12, marginTop: 4 },
  button: {
    backgroundColor: "#6B8FA3",
    borderRadius: 13,
    padding: 16,
    alignItems: "center",
    marginTop: 22,
  },
  buttonText: { color: "#FFF", fontWeight: "800" },
});
