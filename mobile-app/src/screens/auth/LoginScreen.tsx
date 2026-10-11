import React, { useEffect, useState } from "react";
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
import {
  loginAccount,
  requestPasswordResetOtp,
  resetPassword,
} from "../../services/api";

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
  const [recovering, setRecovering] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
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
    setLoading(true);
    try {
      if (recovering && !otpSent) {
        const response = await requestPasswordResetOtp(email.trim());
        setOtpSent(true);
        setResendSeconds(60);
        Alert.alert("Kiểm tra email", response.message);
      } else if (recovering) {
        if (!/^\d{6}$/.test(otp.trim())) {
          Alert.alert("Mã OTP không hợp lệ", "Vui lòng nhập đủ 6 chữ số.");
          return;
        }
        if (
          newPassword.length < 8 ||
          newPassword.length > 72 ||
          !/[A-Z]/.test(newPassword) ||
          !/[a-z]/.test(newPassword) ||
          !/\d/.test(newPassword) ||
          !/[^A-Za-z0-9]/.test(newPassword)
        ) {
          Alert.alert(
            "Mật khẩu chưa đủ mạnh",
            "Cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.",
          );
          return;
        }
        if (newPassword !== confirmPassword) {
          Alert.alert("Mật khẩu không khớp", "Hãy nhập lại mật khẩu xác nhận.");
          return;
        }
        const response = await resetPassword({
          email: email.trim(),
          otp: otp.trim(),
          new_password: newPassword,
        });
        Alert.alert("Đặt lại mật khẩu", response.message);
        setRecovering(false);
        setOtpSent(false);
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const response = await loginAccount({ email: email.trim(), password });
        onAuthenticated(response.data.user, response.data.access_token);
      }
    } catch (error: any) {
      Alert.alert(
        "Đăng nhập thất bại",
        error?.response?.data?.message || "Không kết nối được máy chủ.",
      );
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    try {
      const response = await requestPasswordResetOtp(email.trim());
      setResendSeconds(60);
      Alert.alert("Kiểm tra email", response.message);
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
      <View style={styles.content}>
        <Text style={styles.brand}>HubStay</Text>
        <Text style={styles.title}>
          {recovering ? "Khôi phục mật khẩu" : "Chào mừng trở lại"}
        </Text>
        <Text style={styles.subtitle}>
          {recovering
            ? "Nhận mã xác thực qua email để đặt mật khẩu mới."
            : "Đăng nhập để tiếp tục tìm hoặc cho thuê phòng."}
        </Text>
        <Text style={styles.label}>EMAIL</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!recovering || !otpSent}
          placeholder="you@example.com"
          style={styles.input}
        />
        {!recovering ? (
          <>
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
                accessibilityLabel={
                  showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                }
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
          </>
        ) : null}
        {recovering && otpSent ? (
          <>
            <Text style={styles.label}>MÃ OTP</Text>
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
            <Text style={styles.label}>MẬT KHẨU MỚI</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoComplete="new-password"
              maxLength={72}
              placeholder="Ít nhất 8 ký tự đủ nhóm"
              style={styles.input}
            />
            <Text style={styles.label}>XÁC NHẬN MẬT KHẨU</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              maxLength={72}
              placeholder="Nhập lại mật khẩu mới"
              style={styles.input}
            />
          </>
        ) : null}
        <TouchableOpacity
          disabled={
            loading ||
            !email.trim() ||
            (!recovering && !password) ||
            (recovering &&
              otpSent &&
              (!otp || !newPassword || !confirmPassword))
          }
          onPress={submit}
          style={[
            styles.button,
            (!email.trim() ||
              (!recovering && !password) ||
              (recovering &&
                otpSent &&
                (!otp || !newPassword || !confirmPassword))) &&
              styles.disabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>
              {recovering
                ? otpSent
                  ? "Đặt lại mật khẩu"
                  : "Gửi mã OTP"
                : "Đăng nhập"}
            </Text>
          )}
        </TouchableOpacity>
        {recovering ? (
          <TouchableOpacity
            onPress={() => {
              setRecovering(false);
              setOtpSent(false);
              setResendSeconds(0);
            }}
            style={styles.switch}
          >
            <Text style={styles.switchStrong}>Quay lại đăng nhập</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => {
                setRecovering(true);
                setPassword("");
              }}
              style={styles.switch}
            >
              <Text style={styles.switchStrong}>Quên mật khẩu?</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSwitchToRegister}
              style={styles.switch}
            >
              <Text style={styles.switchText}>
                Chưa có tài khoản?{" "}
                <Text style={styles.switchStrong}>Đăng ký</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F6F4" },
  content: { paddingHorizontal: 24, paddingTop: 40, paddingVertical: 32 },
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
  resend: { alignSelf: "flex-start", paddingTop: 10 },
  switchText: { color: "#66736F" },
  switchStrong: { color: "#00685f", fontWeight: "700" },
});
