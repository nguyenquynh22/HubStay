import React, { useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { createAppointment } from "../../services/api";

interface Props {
  postId: number;
  tenantId: number;
  onBack: () => void;
  onSubmitted: () => void;
}
export default function BookAppointmentModal({
  postId,
  tenantId,
  onBack,
  onSubmitted,
}: Props) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const dateValue = date.trim();
    const timeValue = time.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      Alert.alert("Ngày chưa hợp lệ", "Nhập ngày theo định dạng YYYY-MM-DD.");
      return;
    }
    const parsedDate = new Date(`${dateValue}T00:00:00.000Z`);
    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== dateValue
    ) {
      Alert.alert("Ngày chưa hợp lệ", "Kiểm tra lại ngày bạn muốn đến.");
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeValue)) {
      Alert.alert("Giờ chưa hợp lệ", "Nhập giờ đến theo định dạng HH:mm.");
      return;
    }

    setSubmitting(true);
    try {
      await createAppointment({
        post_id: postId,
        tenant_id: tenantId,
        appointment_date: dateValue,
        appointment_time: timeValue,
        note: note.trim() || undefined,
      });
      Alert.alert(
        "Đã gửi yêu cầu",
        "Người đăng sẽ xác nhận lịch hẹn của bạn.",
        [{ text: "Đóng", onPress: onSubmitted }],
      );
    } catch (error: any) {
      Alert.alert(
        "Không gửi được yêu cầu",
        error?.response?.data?.message || "Kiểm tra kết nối rồi thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
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
          Chọn ngày và giờ đến đã thống nhất với người đăng qua chat.
        </Text>
        <Text style={styles.label}>Ngày đến</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9AAAB0"
          style={styles.input}
          keyboardType="numbers-and-punctuation"
        />
        <Text style={styles.label}>Giờ đến</Text>
        <TextInput
          value={time}
          onChangeText={setTime}
          placeholder="HH:mm, ví dụ 18:30"
          placeholderTextColor="#9AAAB0"
          style={styles.input}
          keyboardType="numbers-and-punctuation"
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
        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Gửi yêu cầu đặt lịch</Text>
          )}
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
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: "#FFF", fontWeight: "800" },
});
