// src/screens/main/CreatePostScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Switch,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import AdministrativeAreaPicker from "../../components/AdministrativeAreaPicker";
import {
  AdministrativeAreaSelection,
  createLandmark,
  createPost,
  getLandmarks,
} from "../../services/api";

interface Props {
  onCreated: () => void;
  onBack?: () => void;
}

const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .toLocaleLowerCase("vi");

const normalizeAreaName = (value: string) =>
  normalizeSearch(value).replace(
    /^(thanh pho trung uong|thanh pho|thi xa|thi tran|dac khu|quan|huyen|tinh|xa|phuong)\s+/,
    "",
  );

const formatCoordinates = (latitude: number, longitude: number) =>
  `${latitude}, ${longitude}`;

const parseCoordinates = (value: string) => {
  const parts = value.split(",");
  if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) return null;
  const latitude = Number(parts[0].trim());
  const longitude = Number(parts[1].trim());
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
    return null;
  return { latitude, longitude };
};

export default function CreatePostScreen({ onCreated, onBack }: Props) {
  const NativeMapView: any =
    Platform.OS === "web" ? null : require("react-native-maps").default;
  const NativeMapMarker: any =
    Platform.OS === "web" ? null : require("react-native-maps").Marker;
  // Step State
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [postType, setPostType] = useState<
    "RENTAL" | "SHARE" | "PASS" | "FIND"
  >("RENTAL");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  // Location State
  const [addressText, setAddressText] = useState("");
  const [administrativeArea, setAdministrativeArea] =
    useState<AdministrativeAreaSelection>({
      province: null,
      district: null,
      ward: null,
    });
  const [landmarks, setLandmarks] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedLandmark, setSelectedLandmark] = useState<any>(null);
  const [landmarkSearch, setLandmarkSearch] = useState("");
  const [addingLandmark, setAddingLandmark] = useState(false);
  const [newLandmarkName, setNewLandmarkName] = useState("");
  const [newLandmarkCategory, setNewLandmarkCategory] = useState("OTHER");
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [mapPickerPurpose, setMapPickerPurpose] = useState<"post" | "landmark">(
    "post",
  );
  const [mapPin, setMapPin] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mapPinInput, setMapPinInput] = useState("");
  const [mapAddress, setMapAddress] = useState("");
  const [landmarkLocationConfirmed, setLandmarkLocationConfirmed] =
    useState(false);
  const [addressLookupLoading, setAddressLookupLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [coordinateInput, setCoordinateInput] = useState("");
  const [loadingLocation, setLoadingLocation] = useState(false);

  const openPostMapPicker = () => {
    setMapPickerPurpose("post");
    const pin = coords ? { latitude: coords.lat, longitude: coords.lng } : null;
    setMapPin(pin);
    setMapPinInput(pin ? formatCoordinates(pin.latitude, pin.longitude) : "");
    setMapPickerVisible(true);
  };

  const updatePostCoordinates = (value: string) => {
    setCoordinateInput(value);
    const parsed = parseCoordinates(value);
    setCoords(parsed ? { lat: parsed.latitude, lng: parsed.longitude } : null);
  };

  const updateMapPinInput = (value: string) => {
    setMapPinInput(value);
    setMapPin(parseCoordinates(value));
    setLandmarkLocationConfirmed(false);
  };

  const lookupAddress = async (
    address: string,
    purpose: "post" | "landmark",
  ) => {
    if (!address.trim()) {
      Alert.alert(
        "Enter address",
        "Enter an address before searching the map.",
      );
      return;
    }
    setAddressLookupLoading(true);
    setMapPickerPurpose(purpose);
    try {
      let point: { latitude: number; longitude: number } | null = null;
      try {
        const matches = await Location.geocodeAsync(address.trim());
        if (matches.length)
          point = {
            latitude: matches[0].latitude,
            longitude: matches[0].longitude,
          };
      } catch {
        // Try the network geocoder below when the OS geocoder is unavailable.
      }
      if (!point) {
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=vi&q=${encodeURIComponent(address.trim())}`;
          const response = await fetch(url, {
            headers: { Accept: "application/json" },
          });
          const results = response.ok ? await response.json() : [];
          if (results[0])
            point = {
              latitude: Number(results[0].lat),
              longitude: Number(results[0].lon),
            };
        } catch {
          // The interactive map remains available for manual pin placement.
        }
      }
      const foundAddress = !!point;
      const resolvedPoint =
        point ||
        mapPin ||
        (coords
          ? { latitude: coords.lat, longitude: coords.lng }
          : { latitude: 20.95, longitude: 106.06 });
      setMapPin(resolvedPoint);
      setMapPinInput(
        formatCoordinates(resolvedPoint.latitude, resolvedPoint.longitude),
      );
      if (purpose === "landmark") setLandmarkLocationConfirmed(false);
      setMapPickerVisible(true);
      if (!foundAddress) {
        Alert.alert(
          "Address not located",
          "The map is open near the last known area. Pan or zoom the map, then tap to place the pin.",
        );
      }
    } catch {
      const point =
        mapPin ||
        (coords
          ? { latitude: coords.lat, longitude: coords.lng }
          : { latitude: 20.95, longitude: 106.06 });
      setMapPin(point);
      setMapPinInput(formatCoordinates(point.latitude, point.longitude));
      if (purpose === "landmark") setLandmarkLocationConfirmed(false);
      setMapPickerVisible(true);
      Alert.alert(
        "Address lookup unavailable",
        "You can still choose a location on the map. Pan or zoom, then tap to place the pin.",
      );
    } finally {
      setAddressLookupLoading(false);
    }
  };

  const lookupLandmarkAddress = () =>
    lookupAddress(mapAddress.trim() || newLandmarkName, "landmark");
  const lookupRoomAddress = () => lookupAddress(addressText, "post");

  const confirmMapPin = async () => {
    if (!mapPin) {
      Alert.alert("Chưa ghim vị trí", "Chạm vào bản đồ để chọn tọa độ.");
      return;
    }
    if (mapPickerPurpose === "post") {
      setCoords({ lat: mapPin.latitude, lng: mapPin.longitude });
      setCoordinateInput(formatCoordinates(mapPin.latitude, mapPin.longitude));
    }
    try {
      const geocodes = await Location.reverseGeocodeAsync(mapPin);
      const place = geocodes[0];
      const address = place
        ? [
            place.name,
            place.street,
            place.district || place.subregion,
            place.city,
          ]
            .filter(Boolean)
            .join(", ")
        : "";
      if (address) {
        if (mapPickerPurpose === "post") {
          if (!addressText.trim()) setAddressText(address);
        } else if (!mapAddress.trim()) setMapAddress(address);
      }
    } catch {
      // Coordinates are enough to calculate distances when reverse geocoding is unavailable.
    }
    setMapPickerVisible(false);
  };

  // Images & Other Settings
  const [images, setImages] = useState<string[]>([]);
  const [enableBooking, setEnableBooking] = useState(true);

  const appendPickedImages = (assets: ImagePicker.ImagePickerAsset[]) => {
    const remaining = 6 - images.length;
    if (remaining <= 0) {
      Alert.alert("Đã đủ ảnh", "Mỗi bài đăng có thể tải tối đa 6 ảnh.");
      return;
    }
    const selected = assets
      .slice(0, remaining)
      .map((asset) => {
        if (!asset.base64) return null;
        if (asset.base64.length * 0.75 > 8 * 1024 * 1024) return null;
        const mimeType = asset.mimeType || "image/jpeg";
        if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType))
          return null;
        return `data:${mimeType};base64,${asset.base64}`;
      })
      .filter((uri): uri is string => !!uri);
    if (!selected.length) {
      Alert.alert("Không đọc được ảnh", "Hãy thử chọn ảnh khác.");
      return;
    }
    const totalChars = [...images, ...selected].reduce(
      (total, image) => total + image.length,
      0,
    );
    if (totalChars > 40 * 1024 * 1024) {
      Alert.alert(
        "Ảnh quá lớn",
        "Tổng dung lượng ảnh vượt quá giới hạn. Hãy chọn ảnh có độ phân giải thấp hơn.",
      );
      return;
    }
    setImages((current) => [...current, ...selected].slice(0, 6));
  };

  const pickImagesFromAlbum = async () => {
    if (images.length >= 6) {
      Alert.alert("Đã đủ ảnh", "Mỗi bài đăng có thể tải tối đa 6 ảnh.");
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 6 - images.length,
        allowsEditing: false,
        quality: 0.65,
        base64: true,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (!result.canceled) appendPickedImages(result.assets);
    } catch {
      Alert.alert(
        "Không mở được album",
        "Hãy thử lại hoặc chụp ảnh trực tiếp.",
      );
    }
  };

  const takePhoto = async () => {
    if (images.length >= 6) {
      Alert.alert("Đã đủ ảnh", "Mỗi bài đăng có thể tải tối đa 6 ảnh.");
      return;
    }
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Cần quyền camera",
          "Cho phép camera để chụp ảnh phòng trọ.",
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.65,
        base64: true,
      });
      if (!result.canceled) appendPickedImages(result.assets);
    } catch {
      Alert.alert(
        "Không mở được camera",
        "Hãy thử lại hoặc chọn ảnh trong album.",
      );
    }
  };

  // Hàm lấy vị trí GPS hiện tại (Nút cho phép truy cập vị trí)
  const handleGetCurrentLocation = async (showFeedback = true) => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (showFeedback) {
          Alert.alert(
            "Quyền truy cập bị từ chối",
            "Bạn có thể chọn vị trí phòng trên bản đồ thay thế.",
          );
        }
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCoords({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      setCoordinateInput(
        formatCoordinates(location.coords.latitude, location.coords.longitude),
      );

      // Lấy tên địa danh tương đối từ tọa độ
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode.length > 0) {
        const place = geocode[0];
        const formattedAddress = `Gần ${place.street || place.name || ""}, ${place.subregion || place.district || ""}`;
        setAddressText(formattedAddress);
      }
      if (showFeedback) {
        Alert.alert(
          "Đã lấy vị trí",
          "Bạn có thể ghim lại vị trí phòng trên bản đồ nếu cần.",
        );
      }
    } catch (error) {
      if (showFeedback) {
        Alert.alert(
          "Không lấy được GPS",
          "Bạn có thể chọn vị trí phòng trên bản đồ.",
        );
      }
    } finally {
      setLoadingLocation(false);
    }
  };

  useEffect(() => {
    getLandmarks()
      .then((r) => setLandmarks(r.data || []))
      .catch(console.error);
    handleGetCurrentLocation(false);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handleMapMessage = (event: MessageEvent) => {
      const data = event.data;
      if (
        data?.type !== "hubstay-map-pin" ||
        !Number.isFinite(data.latitude) ||
        !Number.isFinite(data.longitude)
      )
        return;
      const point = { latitude: data.latitude, longitude: data.longitude };
      setMapPin(point);
      setMapPinInput(formatCoordinates(point.latitude, point.longitude));
      setLandmarkLocationConfirmed(false);
    };
    window.addEventListener("message", handleMapMessage);
    return () => window.removeEventListener("message", handleMapMessage);
  }, []);

  const renderWebMap = (
    point: { latitude: number; longitude: number },
    height: number,
  ) => {
    const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;width:100%;margin:0} .leaflet-container{font:14px sans-serif}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const center=[${point.latitude},${point.longitude}];const map=L.map('map').setView(center,15);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);let marker=L.marker(center).addTo(map);map.on('click',function(e){marker.setLatLng(e.latlng);parent.postMessage({type:'hubstay-map-pin',latitude:e.latlng.lat,longitude:e.latlng.lng},'*')});</script></body></html>`;
    return React.createElement("iframe" as any, {
      title: "Select location on map",
      srcDoc: html,
      style: { width: "100%", height, border: 0, borderRadius: 12 },
    });
  };

  const landmarkTokens = normalizeSearch(landmarkSearch.trim())
    .split(/\s+/)
    .filter(Boolean);
  const areaTerms = [
    administrativeArea.province,
    administrativeArea.district,
    administrativeArea.ward,
  ]
    .filter((unit): unit is NonNullable<typeof unit> => !!unit)
    .map((unit) => normalizeAreaName(unit.name));
  const matchingLandmarks = landmarks
    .filter((item) => {
      if (!administrativeArea.province) return true;
      if (item.province_code != null) {
        return (
          Number(item.province_code) === administrativeArea.province.code &&
          (!administrativeArea.district ||
            Number(item.district_code) === administrativeArea.district.code) &&
          (!administrativeArea.ward ||
            Number(item.ward_code) === administrativeArea.ward.code)
        );
      }
      const address = normalizeSearch(item.address || "");
      return areaTerms.every((term) => address.includes(term));
    })
    .map((item) => {
      const searchableText = normalizeSearch(
        `${item.name} ${item.address} ${item.category}`,
      );
      const matchCount = landmarkTokens.filter((token) =>
        searchableText.includes(token),
      ).length;
      return {
        item,
        score: landmarkTokens.length ? matchCount / landmarkTokens.length : 0,
      };
    })
    .filter(({ score }) => landmarkTokens.length > 0 && score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);

  const createPinnedLandmark = async () => {
    if (!newLandmarkName.trim()) {
      Alert.alert("Thiếu tên địa điểm", "Nhập tên địa điểm mới trước khi lưu.");
      return;
    }
    if (
      !mapPin ||
      !Number.isFinite(mapPin.latitude) ||
      !Number.isFinite(mapPin.longitude) ||
      mapPin.latitude < 8 ||
      mapPin.latitude > 24 ||
      mapPin.longitude < 102 ||
      mapPin.longitude > 110
    ) {
      Alert.alert(
        "Chưa ghim vị trí",
        "Chạm vào bản đồ để chọn tọa độ địa điểm.",
      );
      return;
    }
    if (!landmarkLocationConfirmed) {
      Alert.alert(
        "Chưa xác nhận vị trí",
        "Xem vị trí trên bản đồ, chỉnh ghim nếu cần rồi xác nhận trước khi lưu.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const response = await createLandmark({
        name: newLandmarkName.trim(),
        category: newLandmarkCategory,
        address:
          mapAddress.trim() ||
          `${mapPin.latitude.toFixed(6)}, ${mapPin.longitude.toFixed(6)}`,
        province_code: administrativeArea.province?.code,
        district_code: administrativeArea.district?.code,
        ward_code: administrativeArea.ward?.code,
        latitude: mapPin.latitude,
        longitude: mapPin.longitude,
      });
      const created = response.data;
      setLandmarks((current) => [...current, created]);
      setSelectedLandmark(created);
      setLandmarkSearch("");
      setAddingLandmark(false);
      setMapPickerVisible(false);
      setNewLandmarkName("");
      Alert.alert(
        "Đã thêm địa điểm",
        "Landmark mới đã được lưu và chọn cho bài đăng.",
      );
    } catch (error: any) {
      Alert.alert(
        "Không thêm được địa điểm",
        error?.response?.data?.message || "Kiểm tra kết nối API rồi thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !price.trim()) {
      Alert.alert("Thiếu thông tin", "Nhập tiêu đề và giá thuê.");
      return;
    }
    if (images.length < 2) {
      Alert.alert(
        "Thiếu ảnh phòng",
        "Vui lòng thêm ít nhất 2 ảnh từ album hoặc camera.",
      );
      return;
    }
    if (!coords) {
      Alert.alert(
        "Thiếu vị trí",
        "Lấy vị trí GPS hoặc ghim vị trí phòng trên bản đồ.",
      );
      return;
    }
    if (
      !administrativeArea.province ||
      !administrativeArea.district ||
      !administrativeArea.ward
    ) {
      Alert.alert(
        "Chưa chọn địa chỉ khu vực",
        "Chọn tỉnh/thành phố, quận/huyện và phường/xã để người thuê tìm thấy bài đăng.",
      );
      return;
    }
    setSubmitting(true);
    try {
      await createPost({
        user_id: 1,
        title: title.trim(),
        description: description.trim(),
        price: Number(price.replace(/[^0-9]/g, "")),
        address:
          addressText.trim() ||
          `Vị trí ghim (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`,
        province_code: administrativeArea.province.code,
        district_code: administrativeArea.district.code,
        ward_code: administrativeArea.ward.code,
        latitude: coords.lat,
        longitude: coords.lng,
        landmark_id: selectedLandmark?.landmark_id || null,
        post_type: postType,
        enable_booking: enableBooking ? 1 : 0,
        images,
      });
      Alert.alert("Đăng bài thành công", "Bài đăng đã được lưu vào CSDL.", [
        { text: "OK", onPress: onCreated },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Không đăng được bài",
        error?.response?.data?.message || "Kiểm tra kết nối API và thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.safeContainer}>
      {/* 1. TOP APP BAR */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={24} color="#131b2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đăng Tin Phòng Mới</Text>
        <TouchableOpacity style={styles.draftBtn} onPress={onCreated}>
          <Text style={styles.draftText}>Lưu nháp</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. STEPPER PROGRESSION BAR */}
        <View style={styles.stepperContainer}>
          <View style={styles.stepperLineBackground} />
          <View
            style={[
              styles.stepperLineActive,
              {
                width:
                  currentStep === 1 ? "20%" : currentStep === 2 ? "55%" : "90%",
              },
            ]}
          />

          {/* Step 1 */}
          <TouchableOpacity
            style={styles.stepItem}
            onPress={() => setCurrentStep(1)}
          >
            <View
              style={[
                styles.stepCircle,
                currentStep >= 1
                  ? styles.stepActiveCircle
                  : styles.stepInactiveCircle,
              ]}
            >
              <Text
                style={
                  currentStep >= 1
                    ? styles.stepActiveText
                    : styles.stepInactiveText
                }
              >
                1
              </Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                currentStep === 1 && styles.stepLabelActive,
              ]}
            >
              Thông tin
            </Text>
          </TouchableOpacity>

          {/* Step 2 */}
          <TouchableOpacity
            style={styles.stepItem}
            onPress={() => setCurrentStep(2)}
          >
            <View
              style={[
                styles.stepCircle,
                currentStep >= 2
                  ? styles.stepActiveCircle
                  : styles.stepInactiveCircle,
              ]}
            >
              <Text
                style={
                  currentStep >= 2
                    ? styles.stepActiveText
                    : styles.stepInactiveText
                }
              >
                2
              </Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                currentStep === 2 && styles.stepLabelActive,
              ]}
            >
              Hình ảnh
            </Text>
          </TouchableOpacity>

          {/* Step 3 */}
          <TouchableOpacity
            style={styles.stepItem}
            onPress={() => setCurrentStep(3)}
          >
            <View
              style={[
                styles.stepCircle,
                currentStep >= 3
                  ? styles.stepActiveCircle
                  : styles.stepInactiveCircle,
              ]}
            >
              <Text
                style={
                  currentStep >= 3
                    ? styles.stepActiveText
                    : styles.stepInactiveText
                }
              >
                3
              </Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                currentStep === 3 && styles.stepLabelActive,
              ]}
            >
              Vị trí & Lịch
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. VERIFICATION TRUST BANNER */}
        <View style={styles.trustBanner}>
          <MaterialIcons name="verified" size={22} color="#0058be" />
          <View style={styles.trustTextContainer}>
            <Text style={styles.trustTitle}>
              100% bài đăng được xác minh thực tế
            </Text>
            <Text style={styles.trustSub}>
              Hỗ trợ sinh viên tìm trọ an toàn, tránh tin ảo
            </Text>
          </View>
        </View>

        {/* SECTION 1: HÌNH THỨC ĐĂNG TIN */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>
            Hình thức đăng tin <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.postTypeGrid}>
            {[
              {
                key: "RENTAL",
                label: "Cho thuê phòng",
                sub: "Chính chủ / Môi giới",
                icon: "apartment",
              },
              {
                key: "SHARE",
                label: "Ở ghép",
                sub: "Tìm bạn cùng phòng",
                icon: "group",
              },
              {
                key: "PASS",
                label: "Pass phòng",
                sub: "Nhượng hợp đồng",
                icon: "swap-horiz",
              },
              {
                key: "FIND",
                label: "Tìm phòng",
                sub: "Nhu cầu thuê trọ",
                icon: "search",
              },
            ].map((item) => {
              const active = postType === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.postTypeOption,
                    active && styles.postTypeOptionActive,
                  ]}
                  onPress={() => setPostType(item.key as any)}
                >
                  <MaterialIcons
                    name={item.icon as any}
                    size={20}
                    color={active ? "#00685f" : "#6d7a77"}
                  />
                  <View style={styles.postTypeOptionText}>
                    <Text
                      style={[
                        styles.postTypeTitle,
                        active && styles.postTypeTitleActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.postTypeSub,
                        active && styles.postTypeSubActive,
                      ]}
                    >
                      {item.sub}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SECTION 2: UPLOAD HÌNH ẢNH */}
        <View style={styles.cardSection}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>
              Hình ảnh phòng trọ <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.badgeCount}>{images.length}/6 ảnh</Text>
          </View>
          <Text style={styles.helperText}>
            Đăng tối thiểu 2-3 ảnh sắc nét gồm gác xép, toilet và lối đi.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imageRow}
          >
            {images.map((url, idx) => (
              <View key={idx} style={styles.imageThumbContainer}>
                <Image source={{ uri: url }} style={styles.imageThumb} />
                {idx === 0 && <Text style={styles.coverTag}>Ảnh bìa</Text>}
                <TouchableOpacity
                  style={styles.removeImgBtn}
                  onPress={() => setImages(images.filter((_, i) => i !== idx))}
                >
                  <MaterialIcons name="close" size={14} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={pickImagesFromAlbum}
              accessibilityLabel="Choose photos from album"
            >
              <MaterialIcons
                name="add-photo-alternate"
                size={28}
                color="#00685f"
              />
              <Text style={styles.uploadBtnText}>Thêm ảnh</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={takePhoto}
              accessibilityLabel="Take photo"
            >
              <MaterialIcons name="photo-camera" size={28} color="#00685f" />
              <Text style={styles.uploadBtnText}>Take photo</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* SECTION 3: TIÊU ĐỀ & MÔ TẢ CHI TIẾT (KIỂU BÀI ĐĂNG FB) */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>
            Tiêu đề tin đăng <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ví dụ: Phòng sáng, gần trường ĐH SPKT"
            placeholderTextColor="#9AAAB0"
          />

          <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
            Mô tả chi tiết phòng trọ <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            placeholder="Viết đầy đủ thông tin: Diện tích, điện nước, nội thất, tiện ích xung quanh, giờ giấc..."
            placeholderTextColor="#9AAAB0"
            textAlignVertical="top"
          />
        </View>

        {/* SECTION 4: GIÁ THUÊ & CHI PHÍ */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>
            Giá thuê phòng <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.priceInputWrapper}>
            <TextInput
              style={styles.priceInput}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="2.800.000"
            />
            <Text style={styles.currencySuffix}>đ / tháng</Text>
          </View>

          <View style={styles.insightBox}>
            <MaterialIcons name="insights" size={18} color="#00685f" />
            <Text style={styles.insightText}>
              Giá phổ biến quanh khu vực này:{" "}
              <Text style={styles.insightBold}>2.2 - 3.2 tr/tháng</Text>
            </Text>
          </View>
        </View>

        {/* SECTION 5: VỊ TRÍ TƯƠNG ĐỐI & TRƯỜNG ĐẠI HỌC (TẮT NHẬP TỌA ĐỘ THỦ CÔNG) */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>
            Địa chỉ khu vực <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.locationNote}>
            Chọn đúng khu vực để bài xuất hiện khi người thuê lọc theo địa chỉ.
          </Text>
          <AdministrativeAreaPicker
            value={administrativeArea}
            onChange={setAdministrativeArea}
          />

          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
            Vị trí chính xác của phòng <Text style={styles.required}>*</Text>
          </Text>

          {/* GPS Location Button */}
          <TouchableOpacity
            style={styles.gpsBtn}
            onPress={() => handleGetCurrentLocation()}
            disabled={loadingLocation}
          >
            {loadingLocation ? (
              <ActivityIndicator color="#00685f" />
            ) : (
              <>
                <MaterialIcons name="my-location" size={20} color="#00685f" />
                <Text style={styles.gpsBtnText}>
                  {coords
                    ? "Lấy lại vị trí hiện tại"
                    : "Dùng vị trí hiện tại làm vị trí phòng"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mapLocationBtn}
            onPress={openPostMapPicker}
          >
            <MaterialIcons name="map" size={20} color="#00685f" />
            <Text style={styles.gpsBtnText}>
              Hoặc chọn vị trí phòng trên bản đồ
            </Text>
          </TouchableOpacity>
          <Text style={styles.locationNote}>
            GPS được lấy khi mở màn này. Nếu bạn đang ở nơi khác với phòng, hãy
            chọn vị trí phòng trên bản đồ. Khoảng cách tìm kiếm tính từ ghim
            này.
          </Text>

          <Text style={styles.subInputLabel}>
            Tọa độ phòng (vĩ độ, kinh độ)
          </Text>
          <TextInput
            style={styles.input}
            value={coordinateInput}
            onChangeText={updatePostCoordinates}
            keyboardType="numbers-and-punctuation"
            placeholder="Ví dụ: 20.949937484709523, 106.0595869324687"
          />
        </View>

        {/* SECTION 6: ĐẶT LỊCH XEM PHÒNG */}
        <View style={styles.cardSection}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.sectionLabel}>Bật đặt lịch xem phòng</Text>
              <Text style={styles.helperText}>
                Cho phép sinh viên hẹn giờ qua app
              </Text>
            </View>
            <Switch
              value={enableBooking}
              onValueChange={setEnableBooking}
              trackColor={{ false: "#bcc9c6", true: "#89f5e7" }}
              thumbColor={enableBooking ? "#00685f" : "#f4f3f4"}
            />
          </View>
        </View>

        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>Chọn địa điểm dễ tìm gần nhất</Text>
          <TextInput
            style={styles.input}
            value={landmarkSearch}
            onChangeText={(value) => {
              setLandmarkSearch(value);
              if (selectedLandmark) setSelectedLandmark(null);
            }}
            onSubmitEditing={() => {
              if (!matchingLandmarks[0]) return;
              setSelectedLandmark(matchingLandmarks[0]);
              setLandmarkSearch("");
            }}
            placeholder="Tìm trường học, khu công nghiệp, địa điểm..."
          />
          {selectedLandmark && (
            <TouchableOpacity
              style={styles.selectedLandmark}
              onPress={() => setSelectedLandmark(null)}
            >
              <MaterialIcons name="place" size={17} color="#00685f" />
              <Text style={styles.selectedLandmarkText}>
                {selectedLandmark.name}
                {selectedLandmark.address
                  ? ` · ${selectedLandmark.address}`
                  : ""}
              </Text>
              <MaterialIcons name="close" size={16} color="#64748B" />
            </TouchableOpacity>
          )}
          {landmarkSearch.trim().length >= 2 && (
            <View style={styles.landmarkOptions}>
              {matchingLandmarks.slice(0, 6).map((item) => (
                <TouchableOpacity
                  key={item.landmark_id}
                  style={[
                    styles.landmarkOption,
                    selectedLandmark?.landmark_id === item.landmark_id &&
                      styles.landmarkOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedLandmark(item);
                    setLandmarkSearch("");
                  }}
                >
                  <Text style={styles.landmarkOptionName}>{item.name}</Text>
                  {!!item.address && (
                    <Text style={styles.landmarkOptionAddress}>
                      {item.address}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          {landmarkSearch.trim().length >= 2 &&
            matchingLandmarks.length === 0 && (
              <Text style={styles.helperText}>
                Không thấy địa điểm phù hợp. Thêm mới bằng cách ghim trên bản
                đồ.
              </Text>
            )}
          <TouchableOpacity
            style={styles.addLandmarkButton}
            onPress={() => {
              setAddingLandmark(true);
              setMapPickerPurpose("landmark");
              setMapPinInput("");
              setMapPin(null);
              setMapAddress("");
              setLandmarkLocationConfirmed(false);
            }}
          >
            <MaterialIcons name="add-location-alt" size={18} color="#00685f" />
            <Text style={styles.addLandmarkText}>
              Không có địa điểm? Thêm landmark bằng bản đồ
            </Text>
          </TouchableOpacity>
          {addingLandmark && (
            <View style={styles.newLandmarkForm}>
              <TextInput
                style={styles.input}
                value={newLandmarkName}
                onChangeText={setNewLandmarkName}
                placeholder="Tên địa điểm, ví dụ: Khu công nghiệp..."
              />

              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={mapAddress}
                onChangeText={(value) => {
                  setMapAddress(value);
                  setMapPin(null);
                  setMapPinInput("");
                  setLandmarkLocationConfirmed(false);
                }}
                placeholder="Enter address to find on map"
              />
              <TouchableOpacity
                style={styles.mapLocationBtn}
                onPress={lookupLandmarkAddress}
                disabled={
                  addressLookupLoading ||
                  (!mapAddress.trim() && !newLandmarkName.trim())
                }
              >
                {addressLookupLoading ? (
                  <ActivityIndicator color="#00685f" />
                ) : (
                  <MaterialIcons name="search" size={20} color="#00685f" />
                )}
                <Text style={styles.gpsBtnText}>Tìm địa chỉ trên bản đồ</Text>
              </TouchableOpacity>
              {mapPin && mapPickerPurpose === "landmark" && (
                <>
                  <Text style={styles.helperText}>
                    Kiểm tra vị trí bên dưới. Chạm vào bản đồ để chỉnh ghim.
                  </Text>
                  {Platform.OS === "web" ? (
                    <View style={styles.landmarkMapPreview}>
                      {renderWebMap(mapPin, 220)}
                      <TextInput
                        style={styles.input}
                        value={mapPinInput}
                        onChangeText={updateMapPinInput}
                        keyboardType="numbers-and-punctuation"
                        placeholder="Latitude, longitude"
                      />
                    </View>
                  ) : (
                    <NativeMapView
                      style={styles.landmarkMapPreview}
                      initialRegion={{
                        latitude: mapPin.latitude,
                        longitude: mapPin.longitude,
                        latitudeDelta: 0.015,
                        longitudeDelta: 0.015,
                      }}
                      onPress={(event: any) => {
                        const point = event.nativeEvent.coordinate;
                        setMapPin(point);
                        setMapPinInput(
                          formatCoordinates(point.latitude, point.longitude),
                        );
                        setLandmarkLocationConfirmed(false);
                      }}
                    >
                      <NativeMapMarker coordinate={mapPin} pinColor="#00685f" />
                    </NativeMapView>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.saveLandmarkButton,
                      !landmarkLocationConfirmed &&
                        styles.confirmLocationButton,
                    ]}
                    onPress={() => setLandmarkLocationConfirmed(true)}
                  >
                    <Text style={styles.saveLandmarkText}>
                      {landmarkLocationConfirmed
                        ? "Đã xác nhận vị trí"
                        : "Xác nhận vị trí này"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              <Text style={styles.helperText}>
                {mapPin
                  ? `Đã ghim: ${mapPin.latitude.toFixed(5)}, ${mapPin.longitude.toFixed(5)}`
                  : "Chưa ghim tọa độ."}
              </Text>
              <TouchableOpacity
                style={styles.saveLandmarkButton}
                onPress={createPinnedLandmark}
                disabled={submitting || !landmarkLocationConfirmed}
              >
                <Text style={styles.saveLandmarkText}>
                  {submitting ? "Đang lưu..." : "Lưu và chọn địa điểm mới"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FIXED BOTTOM ACTION BAR */}
      <View style={styles.bottomDock}>
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitBtnText}>Tiếp tục & Đăng bài ngay</Text>
          <MaterialIcons name="check-circle" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
      <Modal
        visible={mapPickerVisible}
        animationType="slide"
        onRequestClose={() => setMapPickerVisible(false)}
      >
        <View style={styles.mapPicker}>
          <View style={styles.mapPickerHeader}>
            <Text style={styles.mapPickerTitle}>Ghim địa điểm mới</Text>
            <TouchableOpacity onPress={() => setMapPickerVisible(false)}>
              <MaterialIcons name="close" size={24} color="#131b2e" />
            </TouchableOpacity>
          </View>
          <Text style={styles.mapHelpText}>
            {Platform.OS === "web"
              ? "Pan or zoom the map, then click the correct location to place the pin."
              : "Chạm một lần vào bản đồ để đặt ghim. Tọa độ sẽ tự điền vào ô."}
          </Text>
          {Platform.OS === "web" ? (
            <View style={styles.webMapPicker}>
              {renderWebMap(
                mapPin || {
                  latitude: coords?.lat || 20.95,
                  longitude: coords?.lng || 106.06,
                },
                520,
              )}
              <TextInput
                style={styles.input}
                keyboardType="numbers-and-punctuation"
                placeholder="Latitude, longitude"
                value={mapPinInput}
                onChangeText={updateMapPinInput}
              />
            </View>
          ) : (
            <NativeMapView
              style={styles.map}
              initialRegion={{
                latitude: mapPin?.latitude || coords?.lat || 20.9,
                longitude: mapPin?.longitude || coords?.lng || 106.0,
                latitudeDelta: 0.025,
                longitudeDelta: 0.025,
              }}
              onPress={(event: any) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                setMapPin({ latitude, longitude });
                setMapPinInput(formatCoordinates(latitude, longitude));
                setLandmarkLocationConfirmed(false);
              }}
            >
              {mapPin && (
                <NativeMapMarker coordinate={mapPin} pinColor="#00685f" />
              )}
            </NativeMapView>
          )}
          <TouchableOpacity
            style={styles.saveLandmarkButton}
            onPress={confirmMapPin}
          >
            <Text style={styles.saveLandmarkText}>
              {mapPin ? "Xác nhận vị trí ghim" : "Đóng bản đồ"}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#faf8ff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#131b2e",
  },
  draftBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  draftText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#00685f",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },

  /* Stepper */
  stepperContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 16,
    position: "relative",
    paddingHorizontal: 20,
  },
  stepperLineBackground: {
    position: "absolute",
    left: 40,
    right: 40,
    top: 14,
    height: 2,
    backgroundColor: "#e2e7ff",
    zIndex: 0,
  },
  stepperLineActive: {
    position: "absolute",
    left: 40,
    top: 14,
    height: 2,
    backgroundColor: "#00685f",
    zIndex: 0,
  },
  stepItem: {
    alignItems: "center",
    zIndex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepActiveCircle: {
    backgroundColor: "#00685f",
  },
  stepInactiveCircle: {
    backgroundColor: "#e2e7ff",
  },
  stepActiveText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  stepInactiveText: {
    color: "#3d4947",
    fontSize: 12,
    fontWeight: "600",
  },
  stepLabel: {
    fontSize: 11,
    color: "#6d7a77",
    marginTop: 4,
  },
  stepLabelActive: {
    color: "#00685f",
    fontWeight: "700",
  },

  /* Trust Banner */
  trustBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eaedff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  trustTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  trustTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#131b2e",
  },
  trustSub: {
    fontSize: 11,
    color: "#6d7a77",
    marginTop: 2,
  },

  /* Sections Card */
  cardSection: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e7ff",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#131b2e",
    marginBottom: 8,
  },
  required: {
    color: "#ba1a1a",
  },
  helperText: {
    fontSize: 12,
    color: "#6d7a77",
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  /* Post Type Grid */
  postTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  postTypeOption: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bcc9c6",
    backgroundColor: "#ffffff",
  },
  postTypeOptionActive: {
    borderColor: "#00685f",
    backgroundColor: "#f4fffc",
  },
  postTypeOptionText: {
    marginLeft: 6,
    flex: 1,
  },
  postTypeTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#131b2e",
  },
  postTypeTitleActive: {
    color: "#00685f",
  },
  postTypeSub: {
    fontSize: 10,
    color: "#6d7a77",
  },
  postTypeSubActive: {
    color: "#008378",
  },

  /* Image Upload */
  badgeCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#00685f",
    backgroundColor: "#eaedff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  imageRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  imageThumbContainer: {
    position: "relative",
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    overflow: "hidden",
  },
  imageThumb: {
    width: "100%",
    height: "100%",
  },
  coverTag: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,104,95,0.85)",
    color: "#fff",
    fontSize: 9,
    textAlign: "center",
    paddingVertical: 2,
    fontWeight: "700",
  },
  removeImgBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#00685f",
    borderStyle: "dashed",
    backgroundColor: "#f2f3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#00685f",
    marginTop: 2,
  },

  /* Form Inputs */
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bcc9c6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#131b2e",
  },
  textArea: {
    minHeight: 100,
  },
  priceInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bcc9c6",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#ffffff",
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#00685f",
    paddingVertical: 10,
  },
  currencySuffix: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6d7a77",
  },
  insightBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f3ff",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  insightText: {
    fontSize: 12,
    color: "#3d4947",
    marginLeft: 6,
  },
  insightBold: {
    fontWeight: "700",
    color: "#00685f",
  },

  /* Location Section */
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eaedff",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#adc6ff",
    marginBottom: 8,
  },
  mapLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF5F1",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#B7DED4",
    marginBottom: 8,
    gap: 6,
  },
  locationNote: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
    marginBottom: 8,
  },
  gpsBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00685f",
    marginLeft: 6,
  },
  coordsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  coordsText: {
    fontSize: 11,
    color: "#15803D",
    fontWeight: "600",
    marginLeft: 4,
  },
  subInputLabel: {
    fontSize: 12,
    color: "#3d4947",
    marginTop: 8,
    marginBottom: 4,
    fontWeight: "600",
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bcc9c6",
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "#ffffff",
  },
  inputIcon: {
    marginRight: 6,
  },
  inputInner: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: "#131b2e",
  },

  landmarkOptions: { marginTop: 8, gap: 6 },
  selectedLandmark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    padding: 10,
    backgroundColor: "#DDF4EF",
    borderRadius: 8,
  },
  selectedLandmarkText: {
    flex: 1,
    fontSize: 12,
    color: "#00685f",
    fontWeight: "600",
  },
  landmarkOption: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
  },
  landmarkOptionActive: { borderColor: "#00685f", backgroundColor: "#EAF5F1" },
  landmarkOptionName: { color: "#1F2937", fontSize: 13, fontWeight: "600" },
  landmarkOptionAddress: { color: "#64748B", fontSize: 11, marginTop: 2 },
  addLandmarkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#00685f",
    borderRadius: 8,
    padding: 11,
    marginTop: 12,
  },
  addLandmarkText: { color: "#00685f", fontWeight: "700", fontSize: 12 },
  newLandmarkForm: { marginTop: 10, gap: 8 },
  categoryOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  categoryOption: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },
  categoryOptionActive: { backgroundColor: "#DDF4EF" },
  categoryText: { color: "#00685f", fontSize: 10, fontWeight: "700" },
  saveLandmarkButton: {
    backgroundColor: "#00685f",
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    marginTop: 10,
  },
  saveLandmarkText: { color: "white", fontSize: 13, fontWeight: "700" },
  mapPicker: { flex: 1, padding: 16, backgroundColor: "#F3F4F6" },
  mapPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  mapPickerTitle: { fontSize: 18, fontWeight: "700", color: "#131b2e" },
  mapHelpText: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    marginVertical: 8,
  },
  map: { flex: 1, borderRadius: 12, overflow: "hidden", marginVertical: 12 },
  landmarkMapPreview: {
    height: 220,
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
  },
  confirmLocationButton: { backgroundColor: "#64748B" },
  webMapHelp: { gap: 8, paddingVertical: 16 },
  webMapPicker: { flex: 1, gap: 10, paddingVertical: 8 },

  /* Bottom Dock */
  bottomDock: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eaedff",
  },
  submitBtn: {
    backgroundColor: "#00685f",
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
