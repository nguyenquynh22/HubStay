import React, { useState } from "react";
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { devVerifyUser } from "../../services/api";

interface Props { onBack: () => void; userId?: number; onVerified?: () => void; }
export default function IdentityVerificationScreen({ onBack, userId = 1, onVerified }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const verify = async () => {
    if (code !== "123456") { Alert.alert("Mã chưa đúng", "Mã xác thực demo là 123456."); return; }
    setLoading(true);
    try { await devVerifyUser(userId, code); Alert.alert("Đã xác thực", "Tích xanh demo đã được gắn vào hồ sơ.", [{ text: "OK", onPress: onVerified || onBack }]); }
    catch (e: any) { Alert.alert("Không xác thực được", e?.response?.data?.message || "Kiểm tra API và thử lại."); }
    finally { setLoading(false); }
  };
  return <SafeAreaView style={styles.container}><View style={styles.header}><TouchableOpacity onPress={onBack}><Text style={styles.back}>‹ Quay lại</Text></TouchableOpacity><Text style={styles.heading}>Xác thực hai yếu tố</Text></View>
    <View style={styles.content}><Text style={styles.icon}>✓</Text><Text style={styles.title}>Xác nhận tài khoản HubStay</Text><Text style={styles.text}>Bản demo phát triển không gửi SMS. Nhập mã kiểm thử để gắn tích xanh vào người dùng số {userId}.</Text><Text style={styles.demo}>Mã kiểm thử: 123456</Text><TextInput value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="Nhập mã 6 chữ số" style={styles.input}/><TouchableOpacity disabled={loading} onPress={verify} style={styles.button}>{loading ? <ActivityIndicator color="white"/> : <Text style={styles.buttonText}>Xác thực tài khoản</Text>}</TouchableOpacity><Text style={styles.note}>Xác thực demo chỉ hoạt động khi backend không chạy ở môi trường production. Quy trình KYC giấy tờ được gửi qua bảng verification_requests.</Text></View>
  </SafeAreaView>;
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:"#F8FAFC"},header:{padding:16,backgroundColor:"white",borderBottomWidth:1,borderColor:"#E2E8F0"},back:{color:"#00685f",fontWeight:"600"},heading:{fontSize:18,fontWeight:"700",marginTop:10,color:"#1E293B"},content:{padding:22,alignItems:"center"},icon:{width:64,height:64,borderRadius:32,backgroundColor:"#DCFCE7",color:"#16A34A",textAlign:"center",textAlignVertical:"center",fontSize:34,overflow:"hidden"},title:{fontSize:20,fontWeight:"700",marginTop:18,color:"#1E293B"},text:{textAlign:"center",color:"#64748B",lineHeight:22,marginTop:8},demo:{marginTop:20,color:"#00685f",fontWeight:"700"},input:{marginTop:12,width:"100%",backgroundColor:"white",borderWidth:1,borderColor:"#CBD5E1",borderRadius:10,padding:14,textAlign:"center",fontSize:20,letterSpacing:6},button:{width:"100%",padding:14,borderRadius:10,backgroundColor:"#00685f",marginTop:14,alignItems:"center"},buttonText:{color:"white",fontWeight:"700"},note:{fontSize:12,color:"#64748B",marginTop:18,lineHeight:18}});
