import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";

interface Props {
  onCreated: () => void;
}
export default function CreatePostScreen({ onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const submit = () => {
    if (!title.trim() || !price.trim()) {
      Alert.alert("Thiếu thông tin", "Hãy nhập tiêu đề và giá phòng.");
      return;
    }
    Alert.alert("Đã tạo bản nháp", "Bài đăng đã được lưu để bạn xem lại.", [
      { text: "Đóng", onPress: onCreated },
    ]);
  };
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>TẠO BÀI ĐĂNG</Text>
      <Text style={styles.title}>Đăng tin mới</Text>
      <Text style={styles.subtitle}>
        Chia sẻ một chỗ ở tốt cho cộng đồng HubStay.
      </Text>
      <Text style={styles.label}>Tiêu đề bài đăng</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Ví dụ: Phòng sáng, gần trường"
        placeholderTextColor="#A2B3AF"
        style={styles.input}
      />
      <Text style={styles.label}>Giá thuê / tháng</Text>
      <TextInput
        value={price}
        onChangeText={setPrice}
        placeholder="2.200.000 đ"
        placeholderTextColor="#A2B3AF"
        keyboardType="numeric"
        style={styles.input}
      />
      <Text style={styles.label}>Tiện ích nổi bật</Text>
      <View style={styles.chips}>
        {["Có nội thất", "Ban công", "Chỗ để xe", "Wifi"].map((item) => (
          <View style={styles.chip} key={item}>
            <Text style={styles.chipText}>+ {item}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.location}>
        <Text style={styles.locationIcon}>⌖</Text>
        <View>
          <Text style={styles.locationTitle}>Chọn vị trí trên bản đồ</Text>
          <Text style={styles.locationSub}>
            Ghim vị trí để người xem dễ tìm
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={submit}>
        <Text style={styles.buttonText}>Lưu bản nháp</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8F7" },
  content: { padding: 22 },
  kicker: {
    color: "#5C8A80",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  title: { color: "#183B36", fontSize: 28, fontWeight: "800", marginTop: 5 },
  subtitle: { color: "#78908B", marginTop: 6, marginBottom: 24 },
  label: {
    color: "#38564F",
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 7,
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DCE9E5",
    borderRadius: 12,
    padding: 14,
    color: "#183B36",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#E4F2EE",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipText: { color: "#287466", fontWeight: "600" },
  location: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 15,
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCE9E5",
  },
  locationIcon: { fontSize: 27, color: "#E77D58", marginRight: 12 },
  locationTitle: { color: "#183B36", fontWeight: "800" },
  locationSub: { color: "#78908B", fontSize: 12, marginTop: 3 },
  arrow: { marginLeft: "auto", fontSize: 24, color: "#78908B" },
  button: {
    backgroundColor: "#20786B",
    padding: 16,
    borderRadius: 13,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
});
