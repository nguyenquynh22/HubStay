import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { getLandmarks, getNearbyPosts, resolveImageUrl } from "../../services/api";

interface Props { onSelectPost: (post: any) => void; }

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/đ/g, "d")
  .replace(/Đ/g, "D")
  .toLocaleLowerCase("vi-VN")
  .replace(/\u0111/g, "d")
  .trim();

export default function HomeScreen({ onSelectPost }: Props) {
  const [landmarks, setLandmarks] = useState<any[]>([]);
  const [landmark, setLandmark] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getLandmarks()
      .then((response) => setLandmarks(response.data || []))
      .catch(() => setError("Không kết nối được máy chủ."))
      .finally(() => setLoading(false));
  }, []);

  const suggestions = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    if (!tokens.length || tokens.join("").length < 2) return [];
    return landmarks
      .map((item) => {
        const text = normalize(`${item.name || ""} ${item.address || ""} ${item.category || ""}`);
        const matched = tokens.filter((token) => text.includes(token)).length;
        return { item, score: matched / tokens.length, exact: text.includes(tokens.join(" ")) };
      })
      .filter((result) => result.score >= 0.5)
      .sort((a, b) => Number(b.exact) - Number(a.exact) || b.score - a.score || String(a.item.name).localeCompare(String(b.item.name), "vi"))
      .slice(0, 6)
      .map((result) => result.item);
  }, [landmarks, query]);

  const searchLandmark = (item: any) => {
    setLandmark(item);
    setQuery(item.name || "");
  };

  useEffect(() => {
    if (!landmark) return;
    let active = true;
    setLoading(true);
    setError("");
    getNearbyPosts(Number(landmark.landmark_id), 10)
      .then((response) => { if (active) setPosts(response.data || []); })
      .catch(() => { if (active) setError("Không tải được bài đăng. Kiểm tra kết nối CSDL/API."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [landmark]);

  const visiblePosts = useMemo(() => {
    // After choosing a landmark, posts are already geographically filtered by the API.
    // Keep an optional text filter within those results.
    const term = normalize(query);
    if (!term || normalize(landmark?.name || "") === term) return posts;
    return posts.filter((post) => normalize(`${post.title || ""} ${post.address || post.address_detail || ""} ${post.author_name || ""}`).includes(term));
  }, [posts, query, landmark]);

  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}><View><Text style={styles.brand}>⌂ HubStay</Text><Text style={styles.slogan}>Tìm trọ & ở ghép sinh viên</Text></View><MaterialIcons name="location-searching" size={25} color="#00685f" /></View>
    <View style={styles.controls}>
      <Text style={styles.label}>TÌM ĐỊA ĐIỂM / TRƯỜNG HỌC</Text>
      <View style={styles.search}><MaterialIcons name="search" size={20} color="#64748B"/><TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => suggestions[0] && searchLandmark(suggestions[0])} returnKeyType="search" placeholder="Ví dụ: sư phạm công nghệ" style={styles.input}/></View>
      {suggestions.length > 0 && <View style={styles.suggestions}>{suggestions.map((item) => <TouchableOpacity key={item.landmark_id} style={styles.suggestion} onPress={() => searchLandmark(item)}><MaterialIcons name="place" size={18} color="#00685f"/><View style={styles.suggestionText}><Text style={styles.landmarkName}>{item.name}</Text>{!!item.address && <Text style={styles.landmarkAddress} numberOfLines={1}>{item.address}</Text>}</View></TouchableOpacity>)}</View>}
      {!!landmark && <Text style={styles.selected}>Đang tìm quanh {landmark.name} · bán kính 10 km</Text>}
    </View>
    {loading ? <ActivityIndicator style={{ marginTop: 40 }} color="#00685f"/> : <FlatList data={visiblePosts} keyExtractor={(item) => String(item.post_id)} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.empty}>{error || (landmark ? "Không tìm thấy bài đăng trong bán kính 10 km." : "Nhập tên trường hoặc địa điểm để tìm.")}</Text>} renderItem={({ item }) => <TouchableOpacity style={styles.card} onPress={() => onSelectPost(item)}>
      {item.image_url ? <Image source={{ uri: resolveImageUrl(item.image_url) }} style={styles.image}/> : <View style={styles.image}/>}
      <View style={styles.cardBody}><View style={styles.badges}><Text style={styles.type}>{item.post_type}</Text>{Number(item.is_vip_active) === 1 && <Text style={styles.vip}>★ VIP</Text>}{Number(item.is_verified_active) === 1 && <Text style={styles.verified}>✓ Đã xác minh</Text>}</View>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text><Text style={styles.price}>{Number(item.price).toLocaleString("vi-VN")} đ/tháng</Text>
        <Text style={styles.muted}>{item.address || item.address_detail}</Text><Text style={styles.muted}>Cách {landmark?.name}: {Number(item.distance_km || 0).toFixed(1)} km · {item.author_name || "Người đăng"}</Text>
      </View></TouchableOpacity>} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:"#F3F4F6"},header:{backgroundColor:"white",padding:16,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},brand:{fontSize:22,fontWeight:"800",color:"#00685f"},slogan:{fontSize:12,color:"#64748B"},controls:{backgroundColor:"white",paddingHorizontal:16,paddingBottom:12},label:{fontSize:10,fontWeight:"700",color:"#64748B",marginBottom:6},search:{flexDirection:"row",alignItems:"center",backgroundColor:"#F3F4F6",borderRadius:10,paddingHorizontal:10},input:{height:42,marginLeft:8,flex:1},suggestions:{backgroundColor:"white",borderRadius:10,borderWidth:1,borderColor:"#E5E7EB",marginTop:4},suggestion:{minHeight:48,paddingHorizontal:10,flexDirection:"row",alignItems:"center",borderBottomWidth:1,borderBottomColor:"#F3F4F6"},suggestionText:{marginLeft:8,flex:1},landmarkName:{fontSize:13,color:"#1F2937",fontWeight:"600"},landmarkAddress:{fontSize:11,color:"#64748B",marginTop:2},selected:{fontSize:11,color:"#00685f",marginTop:8},list:{padding:14},card:{backgroundColor:"white",borderRadius:14,overflow:"hidden",marginBottom:14,borderWidth:1,borderColor:"#E5E7EB"},image:{width:"100%",height:180,backgroundColor:"#E2E8F0"},cardBody:{padding:12},badges:{flexDirection:"row",gap:6,marginBottom:6},type:{fontSize:10,color:"#00685f",backgroundColor:"#EAF5F1",padding:5,borderRadius:10},vip:{fontSize:10,color:"white",backgroundColor:"#7C3AED",padding:5,borderRadius:10},verified:{fontSize:10,color:"#166534",backgroundColor:"#E8F5E9",padding:5,borderRadius:10},title:{fontSize:16,fontWeight:"700",color:"#131b2e"},price:{fontSize:16,fontWeight:"800",color:"#00685f",marginVertical:5},muted:{fontSize:12,color:"#64748B",marginTop:3},empty:{textAlign:"center",padding:24,color:"#64748B"}});
