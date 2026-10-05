import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { registerAccount } from "../../services/api";

interface Props {
  onAuthenticated: (user: any, token: string) => void;
  onSwitchToLogin: () => void;
}

const roles = [
  { value: "STUDENT", label: "Sinh viên" },
  { value: "WORKER", label: "Người đi làm" },
  { value: "LANDLORD", label: "Chủ trọ" },
] as const;

export default function RegisterScreen({
  onAuthenticated,
  onSwitchToLogin,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<(typeof roles)[number]["value"]>("STUDENT");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const response = await registerAccount({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        role,
      });
      onAuthenticated(response.data.user, response.data.access_token);
    } catch (error: any) {
      Alert.alert(
        "Đăng ký thất bại",
        error?.response?.data?.message || "Không kết nối được máy chủ.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>HubStay</Text>
        <Text style={styles.title}>Tạo tài khoản</Text>
        <Text style={styles.subtitle}>
          Một tài khoản cho hành trình tìm và cho thuê phòng.
        </Text>
        <Text style={styles.label}>HỌ VÀ TÊN</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
          placeholder="Nguyễn Văn An"
          style={styles.input}
        />
        <Text style={styles.label}>EMAIL</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="you@example.com"
          style={styles.input}
        />
        <Text style={styles.label}>SỐ ĐIỆN THOẠI (KHÔNG BẮT BUỘC)</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="09..."
          style={styles.input}
        />
        <Text style={styles.label}>LOẠI TÀI KHOẢN</Text>
        <View style={styles.roles}>
          {roles.map((item) => (
            <TouchableOpacity
              key={item.value}
              onPress={() => setRole(item.value)}
              style={[styles.role, role === item.value && styles.roleSelected]}
            >
              <Text
                style={[
                  styles.roleText,
                  role === item.value && styles.roleTextSelected,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>MẬT KHẨU</Text>
        <View style={styles.passwordField}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            placeholder="Ít nhất 8 ký tự"
            style={styles.passwordInput}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            onPress={() => setShowPassword((visible) => !visible)}
            style={styles.visibilityButton}
          >
            <MaterialIcons
              name={showPassword ? "visibility-off" : "visibility"}
              size={21}
              color="#65726e"
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          disabled={
            loading || !fullName.trim() || !email.trim() || password.length < 8
          }
          onPress={submit}
          style={[
            styles.button,
            (!fullName.trim() || !email.trim() || password.length < 8) &&
              styles.disabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Tạo tài khoản</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onSwitchToLogin} style={styles.switch}>
          <Text style={styles.switchText}>
            Đã có tài khoản? <Text style={styles.switchStrong}>Đăng nhập</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F6F4" },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingVertical: 28,
  },
  brand: { color: "#00685f", fontSize: 18, fontWeight: "800" },
  title: { marginTop: 18, color: "#172B27", fontSize: 26, fontWeight: "800" },
  subtitle: {
    marginTop: 7,
    marginBottom: 14,
    color: "#66736F",
    lineHeight: 20,
  },
  label: {
    color: "#56645F",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 13,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#D8E1DD",
    borderRadius: 8,
  },
  passwordField: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#D8E1DD",
    borderRadius: 8,
  },
  passwordInput: { flex: 1, minHeight: 44, paddingHorizontal: 13 },
  visibilityButton: {
    minWidth: 44,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  roles: { flexDirection: "row", gap: 7 },
  role: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D8E1DD",
    backgroundColor: "white",
    borderRadius: 8,
  },
  roleSelected: { borderColor: "#00685f", backgroundColor: "#E6F5F1" },
  roleText: { color: "#56645F", fontSize: 11, fontWeight: "600" },
  roleTextSelected: { color: "#00685f" },
  button: {
    minHeight: 48,
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00685f",
    borderRadius: 8,
  },
  disabled: { opacity: 0.55 },
  buttonText: { color: "white", fontWeight: "700" },
  switch: { alignItems: "center", marginTop: 18 },
  switchText: { color: "#66736F" },
  switchStrong: { color: "#00685f", fontWeight: "700" },
});
