import React, { useEffect, useState } from "react";
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
import {
  registerAccount,
  resendRegistrationOtp,
  verifyRegistrationOtp,
} from "../../services/api";

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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpPending, setOtpPending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [role, setRole] = useState<(typeof roles)[number]["value"]>("STUDENT");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setTimeout(
      () => setResendSeconds((seconds) => seconds - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  const submit = async () => {
    if (otpPending && !/^\d{6}$/.test(otp.trim())) {
      Alert.alert("Mã OTP không hợp lệ", "Vui lòng nhập đủ 6 chữ số.");
      return;
    }
    if (
      !otpPending &&
      (password.length < 8 ||
        password.length > 72 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/\d/.test(password) ||
        !/[^A-Za-z0-9]/.test(password))
    ) {
      Alert.alert(
        "Mật khẩu chưa đủ mạnh",
        "Cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.",
      );
      return;
    }
    if (!otpPending && password !== confirmPassword) {
      Alert.alert("Mật khẩu không khớp", "Hãy nhập lại mật khẩu xác nhận.");
      return;
    }
    setLoading(true);
    try {
      if (otpPending) {
        const response = await verifyRegistrationOtp(email.trim(), otp.trim());
        onAuthenticated(response.data.user, response.data.access_token);
      } else {
        const response = await registerAccount({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password,
          role,
        });
        setOtpPending(true);
        setResendSeconds(60);
        Alert.alert("Đã gửi mã OTP", response.message);
      }
    } catch (error: any) {
      Alert.alert(
        "Đăng ký thất bại",
        error?.response?.data?.message || "Không kết nối được máy chủ.",
      );
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    try {
      const response = await resendRegistrationOtp(email.trim());
      setResendSeconds(60);
      Alert.alert("Đã gửi mã OTP", response.message);
    } catch (error: any) {
      Alert.alert(
        "Không gửi được mã",
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
          editable={!otpPending}
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
          editable={!otpPending}
          placeholder="you@example.com"
          style={styles.input}
        />
        <Text style={styles.label}>SỐ ĐIỆN THOẠI (KHÔNG BẮT BUỘC)</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          editable={!otpPending}
          placeholder="09..."
          style={styles.input}
        />
        <Text style={styles.label}>LOẠI TÀI KHOẢN</Text>
        <View style={styles.roles}>
          {roles.map((item) => (
            <TouchableOpacity
              key={item.value}
              disabled={otpPending}
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
            editable={!otpPending}
            maxLength={72}
            placeholder="Ít nhất 8 ký tự đủ nhóm"
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
        {!otpPending ? (
          <>
            <Text style={styles.label}>NHẬP LẠI MẬT KHẨU</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              maxLength={72}
              placeholder="Nhập lại mật khẩu"
              style={styles.input}
            />
          </>
        ) : null}
        {otpPending ? (
          <>
            <Text style={styles.label}>MÃ OTP GỬI ĐẾN {email.trim()}</Text>
            <TextInput
              value={otp}
              onChangeText={(value) =>
                setOtp(value.replace(/\D/g, "").slice(0, 6))
              }
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="Nhập mã 6 chữ số"
              style={styles.input}
            />
            <TouchableOpacity
              disabled={loading || resendSeconds > 0}
              onPress={resendOtp}
              style={styles.resend}
            >
              <Text style={styles.switchStrong}>
                {resendSeconds > 0
                  ? `Gửi lại mã sau ${resendSeconds} giây`
                  : "Gửi lại mã OTP"}
              </Text>
            </TouchableOpacity>
          </>
        ) : null}
        <TouchableOpacity
          disabled={
            loading ||
            (otpPending
              ? otp.trim().length !== 6
              : !fullName.trim() ||
                !email.trim() ||
                password.length < 8 ||
                password.length > 72 ||
                !/[A-Z]/.test(password) ||
                !/[a-z]/.test(password) ||
                !/\d/.test(password) ||
                !/[^A-Za-z0-9]/.test(password) ||
                password !== confirmPassword)
          }
          onPress={submit}
          style={[
            styles.button,
            (otpPending
              ? otp.trim().length !== 6
              : !fullName.trim() ||
                !email.trim() ||
                password.length < 8 ||
                password.length > 72 ||
                !/[A-Z]/.test(password) ||
                !/[a-z]/.test(password) ||
                !/\d/.test(password) ||
                !/[^A-Za-z0-9]/.test(password) ||
                password !== confirmPassword) && styles.disabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>
              {otpPending ? "Xác nhận OTP" : "Gửi mã xác thực"}
            </Text>
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
  resend: { alignSelf: "flex-start", paddingTop: 10 },
  switchText: { color: "#66736F" },
  switchStrong: { color: "#00685f", fontWeight: "700" },
});
