import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { createPostReport, uploadReportEvidence } from "../../services/api";

interface Props {
  onBack: () => void;
  onSubmitted: (message: string) => void;
  postId: number;
  reporterId: number;
}

type EvidenceImage = {
  dataUri: string;
  previewUri: string;
};

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error.response;
    if (typeof response === "object" && response !== null && "status" in response) {
      if (response.status === 401) {
        return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại rồi thử gửi báo cáo.";
      }
      if (
        typeof response.status === "number" &&
        response.status >= 400 &&
        response.status < 500 &&
        "data" in response
      ) {
        const data = response.data;
        if (
          typeof data === "object" &&
          data !== null &&
          "message" in data &&
          typeof data.message === "string" &&
          data.message.trim()
        ) {
          return data.message;
        }
      }
    }
    return "Chưa thể gửi báo cáo lúc này. Vui lòng thử lại sau.";
  }
  if (error instanceof Error && error.message && error.message !== "Network Error") return error.message;
  return "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.";
}

export default function ReportPostScreen({
  onBack,
  onSubmitted,
  postId,
  reporterId,
}: Props) {
  const [reason, setReason] = useState("Lừa đảo");
  const [description, setDescription] = useState("");
  const [evidenceImage, setEvidenceImage] = useState<EvidenceImage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => onSubmitted(successMessage), 1500);
    return () => clearTimeout(timeout);
  }, [successMessage, onSubmitted]);

  const reasons = [
    "Lừa đảo",
    "Thông tin sai sự thật",
    "Trọ không tồn tại",
    "Khác",
  ];

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitError("");
    if (!Number.isInteger(postId) || postId < 1) {
      Alert.alert("Không gửi được", "Không xác định được bài đăng cần báo cáo.");
      return;
    }
    if (!Number.isInteger(reporterId) || reporterId < 1) {
      Alert.alert("Không gửi được", "Bạn cần đăng nhập để báo cáo bài đăng.");
      return;
    }

    setSubmitting(true);
    try {
      let evidenceImageUrl: string | null = null;
      if (evidenceImage) {
        const uploadResult = await uploadReportEvidence(evidenceImage.dataUri);
        evidenceImageUrl = uploadResult?.url || null;
        if (!evidenceImageUrl) {
          throw new Error("Máy chủ không lưu được ảnh bằng chứng. Vui lòng thử tải ảnh khác lên.");
        }
      }

      const result = await createPostReport({
        post_id: postId,
        reason,
        description: description.trim() || null,
        evidence_image_url: evidenceImageUrl,
      });
      const message = result?.message || "Báo cáo đã được gửi thành công. Ban quản trị sẽ kiểm tra bài đăng này.";
      setSuccessMessage(message);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setSubmitError(message);
      Alert.alert(
        "Không gửi được báo cáo",
        message,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const pickEvidenceImage = async () => {
    if (submitting) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Cần quyền thư viện ảnh", "Cho phép truy cập ảnh để thêm ảnh chứng minh.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) {
        Alert.alert("Không đọc được ảnh", "Hãy chọn lại ảnh chứng minh.");
        return;
      }
      if (asset.base64.length * 0.75 > 5 * 1024 * 1024) {
        Alert.alert("Ảnh quá lớn", "Ảnh chứng minh phải nhỏ hơn 5 MB.");
        return;
      }
      const mimeType = asset.mimeType || "image/jpeg";
      if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
        Alert.alert("Định dạng không hỗ trợ", "Ảnh cần ở định dạng JPG, PNG hoặc WebP.");
        return;
      }
      setEvidenceImage({
        dataUri: `data:${mimeType};base64,${asset.base64}`,
        previewUri: asset.uri,
      });
    } catch {
      Alert.alert("Không mở được thư viện ảnh", "Hãy thử lại sau.");
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
        {submitError ? (
          <View accessibilityRole="alert" style={styles.errorNotice}>
            <Text style={styles.errorNoticeTitle}>Không gửi được báo cáo</Text>
            <Text style={styles.errorNoticeText}>{submitError}</Text>
          </View>
        ) : null}
        {successMessage ? (
          <View accessibilityRole="alert" style={styles.successNotice}>
            <Text style={styles.successNoticeTitle}>Gửi báo cáo thành công</Text>
            <Text style={styles.successNoticeText}>{successMessage}</Text>
            <Text style={styles.successNoticeHint}>Đang quay lại bài đăng…</Text>
          </View>
        ) : null}
        <Text style={styles.title}>Điều gì không ổn?</Text>
        <Text style={styles.subtitle}>
          Báo cáo của bạn giúp HubStay giữ cộng đồng an toàn và đáng tin cậy.
        </Text>
        {reasons.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.reason, reason === item && styles.activeReason]}
            onPress={() => setReason(item)}
            disabled={submitting}
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
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          editable={!submitting}
          multiline
          maxLength={1000}
          placeholder="Thêm chi tiết để ban quản trị kiểm tra nhanh hơn"
          placeholderTextColor="#8EA0A7"
          textAlignVertical="top"
        />
        <Text style={styles.label}>Ảnh chứng minh</Text>
        {evidenceImage ? (
          <View style={styles.evidencePreview}>
            <Image source={{ uri: evidenceImage.previewUri }} style={styles.evidenceImage} />
            <TouchableOpacity
              style={styles.removeEvidenceButton}
              onPress={() => setEvidenceImage(null)}
              disabled={submitting}
            >
              <Text style={styles.removeEvidenceText}>Xóa ảnh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.upload}
            onPress={pickEvidenceImage}
            disabled={submitting}
          >
            <Text style={styles.uploadIcon}>＋</Text>
            <Text style={styles.uploadText}>Thêm ảnh</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
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
  errorNotice: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3B4B4",
    backgroundColor: "#FFF0F0",
  },
  errorNoticeTitle: { color: "#A32121", fontSize: 15, fontWeight: "800" },
  errorNoticeText: { color: "#802828", marginTop: 5, lineHeight: 19 },
  successNotice: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A8DDC6",
    backgroundColor: "#EAF8F1",
  },
  successNoticeTitle: { color: "#0F5132", fontSize: 15, fontWeight: "800" },
  successNoticeText: { color: "#245B42", marginTop: 5, lineHeight: 19 },
  successNoticeHint: { color: "#547A68", marginTop: 8, fontSize: 12 },
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
  input: {
    minHeight: 120,
    backgroundColor: "#FFF",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#DCE5E8",
    color: "#263B43",
    lineHeight: 20,
    padding: 14,
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
  evidencePreview: {
    backgroundColor: "#FFF",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#DCE5E8",
    overflow: "hidden",
  },
  evidenceImage: { width: "100%", height: 180 },
  removeEvidenceButton: {
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#DCE5E8",
    padding: 12,
  },
  removeEvidenceText: { color: "#BA1A1A", fontWeight: "800" },
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
