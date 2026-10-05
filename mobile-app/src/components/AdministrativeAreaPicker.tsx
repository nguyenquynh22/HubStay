import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  AdministrativeAreaSelection,
  AdministrativeUnit,
  getAdministrativeDistricts,
  getAdministrativeProvinces,
  getAdministrativeWards,
} from "../services/api";

type Level = "province" | "district" | "ward";

interface Props {
  value: AdministrativeAreaSelection;
  onChange: (value: AdministrativeAreaSelection) => void;
}

const levelLabels: Record<Level, string> = {
  province: "Tỉnh / thành phố",
  district: "Quận / huyện / thị xã",
  ward: "Phường / xã / thị trấn",
};

export default function AdministrativeAreaPicker({ value, onChange }: Props) {
  const [expandedLevel, setExpandedLevel] = useState<Level | null>(null);
  const [options, setOptions] = useState<AdministrativeUnit[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const togglePicker = async (nextLevel: Level) => {
    if (nextLevel === "district" && !value.province) return;
    if (nextLevel === "ward" && !value.district) return;
    if (expandedLevel === nextLevel) {
      setExpandedLevel(null);
      return;
    }

    setExpandedLevel(nextLevel);
    setQuery("");
    setError("");
    setLoading(true);
    try {
      const items =
        nextLevel === "province"
          ? await getAdministrativeProvinces()
          : nextLevel === "district"
            ? await getAdministrativeDistricts(value.province!.code)
            : await getAdministrativeWards(value.district!.code);
      setOptions(items);
    } catch {
      setOptions([]);
      setError("Không tải được danh sách. Kiểm tra kết nối rồi thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const selectOption = (item: AdministrativeUnit) => {
    if (expandedLevel === "province") {
      onChange({ province: item, district: null, ward: null });
    } else if (expandedLevel === "district") {
      onChange({ ...value, district: item, ward: null });
    } else if (expandedLevel === "ward") {
      onChange({ ...value, ward: item });
    }
    setExpandedLevel(null);
    setQuery("");
  };

  const filteredOptions = options.filter((item) =>
    item.name
      .toLocaleLowerCase("vi")
      .includes(query.trim().toLocaleLowerCase("vi")),
  );

  const renderControl = (
    itemLevel: Level,
    selected: AdministrativeUnit | null,
  ) => {
    const disabled =
      (itemLevel === "district" && !value.province) ||
      (itemLevel === "ward" && !value.district);
    return (
      <View key={itemLevel}>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.control, disabled && styles.controlDisabled]}
          onPress={() => togglePicker(itemLevel)}
          disabled={disabled}
        >
          <View style={styles.controlText}>
            <Text style={styles.label}>{levelLabels[itemLevel]}</Text>
            <Text
              style={[styles.value, !selected && styles.placeholder]}
              numberOfLines={1}
            >
              {selected?.name ||
                (disabled ? "Chọn cấp phía trên trước" : "Chọn địa điểm")}
            </Text>
          </View>
          <MaterialIcons
            name={
              expandedLevel === itemLevel ? "arrow-drop-up" : "arrow-drop-down"
            }
            size={23}
            color="#52645f"
          />
        </TouchableOpacity>
        {expandedLevel === itemLevel && (
          <View style={styles.dropdown}>
            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder={`Gõ để tìm ${levelLabels[itemLevel].toLocaleLowerCase("vi")}`}
              autoCorrect={false}
            />
            {loading ? (
              <ActivityIndicator style={styles.loading} color="#00685f" />
            ) : error ? (
              <Text style={styles.empty}>{error}</Text>
            ) : (
              <ScrollView
                style={styles.options}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {filteredOptions.length ? (
                  filteredOptions.map((item) => (
                    <TouchableOpacity
                      key={item.code}
                      style={styles.option}
                      onPress={() => selectOption(item)}
                    >
                      <Text style={styles.optionText}>{item.name}</Text>
                      <MaterialIcons
                        name="chevron-right"
                        size={20}
                        color="#7c8985"
                      />
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.empty}>Không có kết quả.</Text>
                )}
              </ScrollView>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderControl("province", value.province)}
      {renderControl("district", value.district)}
      {renderControl("ward", value.ward)}
      {(value.province || value.district || value.ward) && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => {
            onChange({ province: null, district: null, ward: null });
            setExpandedLevel(null);
          }}
        >
          <MaterialIcons name="close" size={16} color="#52645f" />
          <Text style={styles.clearText}>Xóa khu vực</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  control: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: "#d4ddd9",
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
  },
  controlDisabled: { backgroundColor: "#f1f4f2" },
  controlText: { flex: 1, paddingRight: 8 },
  label: { color: "#65726e", fontSize: 11, marginBottom: 3 },
  value: { color: "#1c302c", fontSize: 14, fontWeight: "600" },
  placeholder: { color: "#8a9692", fontWeight: "400" },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    padding: 4,
  },
  clearText: { color: "#52645f", fontSize: 12, marginLeft: 3 },
  dropdown: {
    marginTop: 5,
    padding: 8,
    borderWidth: 1,
    borderColor: "#d4ddd9",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  search: {
    height: 44,
    borderWidth: 1,
    borderColor: "#d4ddd9",
    borderRadius: 6,
    paddingHorizontal: 12,
  },
  options: { maxHeight: 220, marginTop: 4 },
  loading: { marginVertical: 18 },
  option: {
    minHeight: 50,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5eae7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionText: { color: "#263b36", fontSize: 14 },
  empty: { textAlign: "center", color: "#65726e", padding: 24 },
});
