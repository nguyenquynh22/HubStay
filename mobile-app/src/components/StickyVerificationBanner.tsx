// src/components/common/StickyVerificationBanner.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface Props {
  isVerified?: boolean;
  onVerifyPress: () => void;
}

export const StickyVerificationBanner: React.FC<Props> = ({
  isVerified = false,
  onVerifyPress,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  // Nếu đã xác thực hoặc người dùng bấm nút [X] ẩn đi thì không render
  if (isVerified || isDismissed) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text} numberOfLines={2}>
        Tài khoản chưa xác thực uy tín.{" "}
        <Text style={styles.linkText} onPress={onVerifyPress}>
          Xác thực ngay
        </Text>
      </Text>
      <TouchableOpacity
        onPress={() => setIsDismissed(true)}
        style={styles.closeBtn}
      >
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FEF3C7", // Vàng cam nhẹ
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#FCD34D",
  },
  text: { fontSize: 13, color: "#92400E", flex: 1 },
  linkText: {
    fontWeight: "bold",
    textDecorationLine: "underline",
    color: "#B45309",
  },
  closeBtn: { padding: 4, marginLeft: 8 },
  closeText: { fontSize: 14, color: "#92400E", fontWeight: "bold" },
});
