import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { createReport } from "../../services/api";

interface Props {
  onBack: () => void;
  postId: number;
  userId: number;
}
export default function ReportPostScreen({ onBack, postId, userId }: Props) {
  const [reason, setReason] = useState("Lừa đảo");
  const [description, setDescription] = useState("");
  const [evidenceImage, setEvidenceImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const reasons = [
    "Lừa đảo",
    "Báo giá sai",
    "Phòng không đúng ảnh",
    "Nội dung không phù hợp",
  ];

  const pickEvidence = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Quyền truy cập ảnh bị từ chối",
        "Vui lòng cấp quyền để tiếp tục.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setEvidenceImage(
        `data:${result.assets[0].mimeType || "image/jpeg"};base64,${result.assets[0].base64}`,
      );
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const result = await createReport({
        post_id: postId,
        reporter_id: userId,
        reason,
        description: description.trim() || undefined,
        evidence_image_url: evidenceImage || undefined,
      });
      Alert.alert(
        "Đã gửi báo cáo",
        result.message || "Báo cáo đang chờ quản trị xử lý.",
        [{ text: "Đóng", onPress: onBack }],
      );
    } catch (error: any) {
      Alert.alert(
        "Không gửi được báo cáo",
        error?.response?.data?.message || "Vui lòng thử lại.",
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
            />
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
        <Text style={styles.label}>Mô tả thêm</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Thêm chi tiết nếu cần"
          multiline
          style={[styles.input, styles.note]}
          placeholderTextColor="#9AAAB0"
        />
        <Text style={styles.label}>Ảnh chứng minh</Text>
        <TouchableOpacity style={styles.upload} onPress={pickEvidence}>
          {evidenceImage ? (
            <Text style={styles.uploadText}>Đã chọn ảnh chứng minh</Text>
          ) : (
            <>
              <Text style={styles.uploadIcon}>＋</Text>
              <Text style={styles.uploadText}>Thêm ảnh hoặc video</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Gửi báo cáo</Text>
          )}
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
    borderColor: "#DCE5E8",
  },
  activeReason: { borderColor: "#E77D58", backgroundColor: "#FFF8F5" },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#9AAAB0",
    marginRight: 11,
  },
  activeRadio: { borderWidth: 5, borderColor: "#E77D58" },
  reasonText: { color: "#536B74" },
  activeReasonText: { color: "#A45A35", fontWeight: "800" },
  label: {
    color: "#445B63",
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
    borderColor: "#DCE5E8",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadIcon: { color: "#E77D58", fontSize: 28 },
  uploadText: { color: "#71858C", marginTop: 4 },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCE5E8",
    padding: 12,
    color: "#263B43",
    textAlignVertical: "top",
  },
  note: { minHeight: 90, marginBottom: 8 },
  button: {
    backgroundColor: "#E77D58",
    borderRadius: 13,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFF", fontWeight: "800" },
});
