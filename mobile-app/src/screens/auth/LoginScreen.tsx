import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { loginAccount } from "../../services/api";

interface Props {
  onAuthenticated: (user: any, token: string) => void;
  onSwitchToRegister: () => void;
}

export default function LoginScreen({
  onAuthenticated,
  onSwitchToRegister,
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const response = await loginAccount({ email: email.trim(), password });
      onAuthenticated(response.data.user, response.data.access_token);
    } catch (error: any) {
      Alert.alert(
        "Đăng nhập thất bại",
        error?.response?.data?.message || "Không kết nối được máy chủ.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brand}>HubStay</Text>
        <Text style={styles.title}>Chào mừng trở lại</Text>
        <Text style={styles.subtitle}>
          Đăng nhập để tiếp tục tìm hoặc cho thuê phòng.
        </Text>
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
        <Text style={styles.label}>MẬT KHẨU</Text>
        <View style={styles.passwordField}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="current-password"
            placeholder="Nhập mật khẩu"
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
          disabled={loading || !email.trim() || !password}
          onPress={submit}
          style={[
            styles.button,
            (!email.trim() || !password) && styles.disabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Đăng nhập</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onSwitchToRegister} style={styles.switch}>
          <Text style={styles.switchText}>
            Chưa có tài khoản? <Text style={styles.switchStrong}>Đăng ký</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F6F4", justifyContent: "center" },
  content: { paddingHorizontal: 24, paddingVertical: 32 },
  brand: { color: "#00685f", fontSize: 18, fontWeight: "800" },
  title: { marginTop: 26, color: "#172B27", fontSize: 27, fontWeight: "800" },
  subtitle: {
    marginTop: 8,
    marginBottom: 28,
    color: "#66736F",
    lineHeight: 21,
  },
  label: {
    color: "#56645F",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 7,
    marginTop: 14,
  },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#D8E1DD",
    borderRadius: 8,
  },
  passwordField: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#D8E1DD",
    borderRadius: 8,
  },
  passwordInput: { flex: 1, minHeight: 48, paddingHorizontal: 14 },
  visibilityButton: {
    minWidth: 46,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    minHeight: 50,
    marginTop: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00685f",
    borderRadius: 8,
  },
  disabled: { opacity: 0.55 },
  buttonText: { color: "white", fontWeight: "700" },
  switch: { alignItems: "center", marginTop: 20 },
  switchText: { color: "#66736F" },
  switchStrong: { color: "#00685f", fontWeight: "700" },
});
