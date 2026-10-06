import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AdministrativeAreaPicker from "../../components/AdministrativeAreaPicker";
import {
  AdministrativeAreaSelection,
  getLandmarks,
  getNotifications,
  resolveImageUrl,
  searchPosts,
} from "../../services/api";

interface Props {
  onSelectPost: (post: any) => void;
  userId: number;
  onOpenNotifications: () => void;
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi-VN")
    .replace(/\u0111/g, "d")
    .trim();

const normalizeAreaName = (value: string) =>
  normalize(value).replace(
    /^(thanh pho trung uong|thanh pho|thi xa|thi tran|dac khu|quan|huyen|tinh|xa|phuong)\s+/,
    "",
  );

export default function HomeScreen({
  onSelectPost,
  userId,
  onOpenNotifications,
}: Props) {
  const [landmarks, setLandmarks] = useState<any[]>([]);
  const [landmark, setLandmark] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [area, setArea] = useState<AdministrativeAreaSelection>({
    province: null,
    district: null,
    ward: null,
  });
  const [radiusKm, setRadiusKm] = useState<number | null>(10);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const areaTerms = useMemo(
    () =>
      [area.province, area.district, area.ward]
        .filter((unit): unit is NonNullable<typeof unit> => !!unit)
        .map((unit) => normalizeAreaName(unit.name)),
    [area],
  );

  const areaLandmarks = useMemo(() => {
    if (!area.province) return landmarks;
    return landmarks.filter((item) => {
      if (item.province_code != null) {
        return (
          Number(item.province_code) === area.province!.code &&
          (!area.district ||
            Number(item.district_code) === area.district.code) &&
          (!area.ward || Number(item.ward_code) === area.ward.code)
        );
      }
      const address = normalize(item.address || "");
      return areaTerms.every((term) => term && address.includes(term));
    });
  }, [area, areaTerms, landmarks]);

  useEffect(() => {
    let active = true;
    Promise.all([getLandmarks(), searchPosts({})])
      .then(([landmarkResponse, postResponse]) => {
        if (!active) return;
        setLandmarks(landmarkResponse.data || []);
        setPosts(postResponse.data || []);
      })
      .catch(() => {
        if (active)
          setError("Không tải được dữ liệu. Kiểm tra kết nối máy chủ.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    getNotifications(userId)
      .then((response) => {
        setUnreadCount(
          (response.data || []).filter((item: any) => !item.is_read).length,
        );
      })
      .catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    if (
      landmark &&
      !areaLandmarks.some(
        (item) => Number(item.landmark_id) === Number(landmark.landmark_id),
      )
    ) {
      setLandmark(null);
      setQuery("");
    }
  }, [areaLandmarks, landmark]);

  const suggestions = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    if (!tokens.length || tokens.join("").length < 2) return [];
    return areaLandmarks
      .map((item) => {
        const text = normalize(
          `${item.name || ""} ${item.address || ""} ${item.category || ""}`,
        );
        const words = text.split(/[^a-z0-9]+/).filter(Boolean);
        const matched = tokens.filter((token) =>
          words.some((word) => word.startsWith(token) || word.includes(token)),
        ).length;
        return {
          item,
          score: matched / tokens.length,
          exact: text.includes(tokens.join(" ")),
        };
      })
      .filter((result) => result.score >= 0.5)
      .sort(
        (a, b) =>
          Number(b.exact) - Number(a.exact) ||
          b.score - a.score ||
          String(a.item.name).localeCompare(String(b.item.name), "vi"),
      )
      .slice(0, 6)
      .map((result) => result.item);
  }, [areaLandmarks, query]);

  const searchLandmark = (item: any) => {
    setLandmark(item);
    setQuery(item.name || "");
  };

  const applyFilters = async () => {
    const hasArea = !!(area.province || area.district || area.ward);
    if (hasArea && !area.district) {
      setError("Chọn ít nhất quận/huyện để tránh trả về quá nhiều bài đăng.");
      return;
    }
    setSearching(true);
    setError("");
    try {
      const response = await searchPosts({
        ...(area.province ? { province_code: area.province.code } : {}),
        ...(area.district ? { district_code: area.district.code } : {}),
        ...(area.ward ? { ward_code: area.ward.code } : {}),
        ...(landmark
          ? {
              landmark_id: Number(landmark.landmark_id),
              radius_km: radiusKm ?? "all",
            }
          : {}),
      });
      setPosts(response.data || []);
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message ||
          "Không tải được bài đăng. Kiểm tra kết nối máy chủ.",
      );
    } finally {
      setSearching(false);
    }
  };

  const visiblePosts = useMemo(() => {
    const term = normalize(query);
    if (!term || normalize(landmark?.name || "") === term) return posts;
    return posts.filter((post) =>
      normalize(
        `${post.title || ""} ${post.address || post.address_detail || ""} ${post.author_name || ""}`,
      ).includes(term),
    );
  }, [posts, query, landmark]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>⌂ HubStay</Text>
          <Text style={styles.slogan}>Tìm trọ & ở ghép sinh viên</Text>
        </View>
        <TouchableOpacity onPress={onOpenNotifications}>
          <View style={styles.notificationButton}>
            <MaterialIcons name="notifications" size={24} color="#00685f" />
            {!!unreadCount && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.controls}>
        <Text style={styles.label}>KHU VỰC (KHÔNG BẮT BUỘC)</Text>
        <AdministrativeAreaPicker value={area} onChange={setArea} />
        <Text style={styles.helper}>
          Có thể lọc theo quận/huyện, phường/xã hoặc chọn địa điểm để tìm theo
          khoảng cách.
        </Text>
        <Text style={[styles.label, styles.landmarkLabel]}>
          TÌM NHANH THEO ĐỊA ĐIỂM
        </Text>
        <Text style={styles.helper}>
          {areaTerms.length
            ? `Gợi ý trong ${area.ward?.name || area.district?.name || area.province?.name}.`
            : "Nhập tên trường, bệnh viện, khu công nghiệp hoặc địa điểm gần bạn."}
        </Text>
        <View style={styles.search}>
          <MaterialIcons name="search" size={20} color="#64748B" />
          <TextInput
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              if (landmark) setLandmark(null);
            }}
            onSubmitEditing={() =>
              suggestions[0] && searchLandmark(suggestions[0])
            }
            returnKeyType="search"
            placeholder="Ví dụ: Bách Khoa, Hồ Tây, Phố Nối..."
            style={styles.input}
          />
        </View>
        {!landmark && suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.landmark_id}
                style={styles.suggestion}
                onPress={() => searchLandmark(item)}
              >
                <MaterialIcons name="place" size={18} color="#00685f" />
                <View style={styles.suggestionText}>
                  <Text style={styles.landmarkName}>{item.name}</Text>
                  {!!item.address && (
                    <Text style={styles.landmarkAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {!landmark && query.trim().length >= 2 && suggestions.length === 0 && (
          <Text style={styles.suggestionEmpty}>
            {areaTerms.length
              ? `Không có địa điểm phù hợp trong ${area.ward?.name || area.district?.name || area.province?.name}.`
              : "Không tìm thấy địa điểm phù hợp. Hãy thử từ khóa khác."}
          </Text>
        )}
        {!!landmark && (
          <View style={styles.selectedRow}>
            <Text style={styles.selected} numberOfLines={1}>
              {landmark.name}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setLandmark(null);
                setQuery("");
              }}
            >
              <MaterialIcons name="close" size={19} color="#52645f" />
            </TouchableOpacity>
          </View>
        )}
        {!!landmark && (
          <View style={styles.radiusRow}>
            {[5, 10, 20, 30, null].map((radius) => (
              <TouchableOpacity
                key={radius ?? "all"}
                style={[
                  styles.radiusChip,
                  radiusKm === radius && styles.radiusChipActive,
                ]}
                onPress={() => setRadiusKm(radius)}
              >
                <Text
                  style={[
                    styles.radiusText,
                    radiusKm === radius && styles.radiusTextActive,
                  ]}
                >
                  {radius == null ? "Mọi khoảng cách" : `${radius} km`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TouchableOpacity
          style={styles.searchButton}
          onPress={applyFilters}
          disabled={searching}
        >
          {searching ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <MaterialIcons name="search" size={19} color="#ffffff" />
          )}
          <Text style={styles.searchButtonText}>
            {searching ? "Đang tìm..." : "Tìm bài đăng"}
          </Text>
        </TouchableOpacity>
        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#00685f" />
      ) : (
        <FlatList
          data={visiblePosts}
          keyExtractor={(item) => String(item.post_id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {error ||
                (landmark
                  ? radiusKm == null
                    ? `Không có bài đăng gần ${landmark.name}.`
                    : `Không có bài đăng trong bán kính ${radiusKm} km.`
                  : area.ward
                    ? `Chưa có bài đăng tại ${area.ward.name}.`
                    : area.district
                      ? `Chưa có bài đăng tại ${area.district.name}.`
                      : area.province
                        ? `Chưa có bài đăng tại ${area.province.name}.`
                        : "Chưa có bài đăng phù hợp. Hãy chọn khu vực hoặc địa điểm để lọc.")}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => onSelectPost(item)}
            >
              {item.image_url ? (
                <Image
                  source={{ uri: resolveImageUrl(item.image_url) }}
                  style={styles.image}
                />
              ) : (
                <View style={styles.image} />
              )}
              <View style={styles.cardBody}>
                <View style={styles.badges}>
                  <Text style={styles.type}>{item.post_type}</Text>
                  {Number(item.is_vip_active) === 1 && (
                    <Text style={styles.vip}>★ VIP</Text>
                  )}
                  {Number(item.is_verified_active) === 1 && (
                    <Text style={styles.verified}>✓ Đã xác minh</Text>
                  )}
                </View>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.price}>
                  {Number(item.price).toLocaleString("vi-VN")} đ/tháng
                </Text>
                <Text style={styles.muted}>
                  {item.address || item.address_detail}
                </Text>
                {!!landmark && item.distance_km != null && (
                  <Text style={styles.muted}>
                    Cách {landmark.name}: {Number(item.distance_km).toFixed(1)}{" "}
                    km
                  </Text>
                )}
                <Text style={styles.muted}>
                  {item.author_name || "Người đăng"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    backgroundColor: "white",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { fontSize: 22, fontWeight: "800", color: "#00685f" },
  slogan: { fontSize: 12, color: "#64748B" },
  notificationButton: { position: "relative", padding: 6 },
  notificationBadge: {
    position: "absolute",
    right: 0,
    top: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: { color: "white", fontSize: 10, fontWeight: "700" },
  controls: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 10,
  },
  label: { fontSize: 10, fontWeight: "700", color: "#64748B", marginBottom: 6 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  input: { height: 42, marginLeft: 8, flex: 1 },
  helper: { color: "#697873", fontSize: 11, marginTop: 5 },
  landmarkLabel: { marginTop: 13 },
  suggestions: {
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 4,
  },
  suggestion: {
    minHeight: 48,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  suggestionText: { marginLeft: 8, flex: 1 },
  landmarkName: { fontSize: 13, color: "#1F2937", fontWeight: "600" },
  landmarkAddress: { fontSize: 11, color: "#64748B", marginTop: 2 },
  suggestionEmpty: {
    color: "#697873",
    fontSize: 12,
    paddingHorizontal: 4,
    paddingVertical: 9,
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
    gap: 8,
  },
  selected: { flex: 1, fontSize: 12, color: "#00685f", fontWeight: "600" },
  radiusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  radiusChip: {
    borderWidth: 1,
    borderColor: "#c9d4cf",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  radiusChipActive: { backgroundColor: "#00685f", borderColor: "#00685f" },
  radiusText: { color: "#35443f", fontSize: 12, fontWeight: "600" },
  radiusTextActive: { color: "#ffffff" },
  searchButton: {
    minHeight: 42,
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: "#00685f",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  searchButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  error: { color: "#a23b33", fontSize: 12, marginTop: 8 },
  list: { padding: 14 },
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  image: { width: "100%", height: 180, backgroundColor: "#E2E8F0" },
  cardBody: { padding: 12 },
  badges: { flexDirection: "row", gap: 6, marginBottom: 6 },
  type: {
    fontSize: 10,
    color: "#00685f",
    backgroundColor: "#EAF5F1",
    padding: 5,
    borderRadius: 10,
  },
  vip: {
    fontSize: 10,
    color: "white",
    backgroundColor: "#7C3AED",
    padding: 5,
    borderRadius: 10,
  },
  verified: {
    fontSize: 10,
    color: "#166534",
    backgroundColor: "#E8F5E9",
    padding: 5,
    borderRadius: 10,
  },
  title: { fontSize: 16, fontWeight: "700", color: "#131b2e" },
  price: {
    fontSize: 16,
    fontWeight: "800",
    color: "#00685f",
    marginVertical: 5,
  },
  muted: { fontSize: 12, color: "#64748B", marginTop: 3 },
  empty: { textAlign: "center", padding: 24, color: "#64748B" },
});
