import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";

interface Props {
  onBack: () => void;
  onSubmitted: () => void;
}
export default function BookAppointmentModal({ onBack, onSubmitted }: Props) {
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const submit = () => {
    if (!time.trim()) {
      Alert.alert(
        "Chọn thời gian",
        "Vui lòng nhập giờ bạn muốn đến xem phòng.",
      );
      return;
    }
    Alert.alert("Đã gửi yêu cầu", "Người đăng sẽ xác nhận lịch hẹn của bạn.", [
      { text: "Đóng", onPress: onSubmitted },
    ]);
  };
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>‹ Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Đặt lịch xem phòng</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.heading}>Chọn giờ bạn muốn đến</Text>
        <Text style={styles.sub}>
          Người đăng có thể đón khách trong khoảng thời gian rảnh.
        </Text>
        <Text style={styles.label}>Giờ đến</Text>
        <TextInput
          value={time}
          onChangeText={setTime}
          placeholder="Ví dụ: 18:30, ngày 20/10"
          placeholderTextColor="#9AAAB0"
          style={styles.input}
        />
        <Text style={styles.label}>Ghi chú (không bắt buộc)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Bạn đi cùng ai? Cần hỏi thêm gì?"
          placeholderTextColor="#9AAAB0"
          multiline
          style={[styles.input, styles.note]}
        />
        <TouchableOpacity style={styles.button} onPress={submit}>
          <Text style={styles.buttonText}>Gửi yêu cầu đặt lịch</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FA" },
  header: {
    backgroundColor: "#FFF",
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#DCE5E8",
  },
  back: { color: "#547A8A", fontWeight: "700" },
  title: {
    flex: 1,
    textAlign: "center",
    color: "#263B43",
    fontSize: 17,
    fontWeight: "800",
  },
  content: { padding: 22 },
  heading: { color: "#263B43", fontSize: 24, fontWeight: "800" },
  sub: { color: "#71858C", lineHeight: 20, marginTop: 7, marginBottom: 23 },
  label: {
    color: "#445B63",
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 7,
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DCE5E8",
    borderRadius: 12,
    padding: 14,
    color: "#263B43",
  },
  note: { height: 100, textAlignVertical: "top" },
  button: {
    backgroundColor: "#6B8FA3",
    padding: 16,
    borderRadius: 13,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: { color: "#FFF", fontWeight: "800" },
});
