// src/types/mockData.ts

export interface Post {
  id: string;
  title: string;
  price: string;
  address: string;
  university: string;
  badge: 'SƯ PHẠM KỸ THUẬT' | 'BÁCH KHOA' | 'GIAO THÔNG';
  imageUrl: string;
  isVerifiedHost: boolean;
  type: 'CHO_THUE' | 'O_GHEP' | 'PASS_PHONG';
}

export interface Appointment {
  id: string;
  postId: string;
  postTitle: string;
  userName: string;
  userPhone: string;
  timeSlot: string;
  date: string;
  note: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
}

export const MOCK_POSTS: Post[] = [
  {
    id: 'p1',
    title: 'Phòng trọ khép kín full đồ gần ĐH Sư Phạm Kỹ Thuật Hưng Yên',
    price: '2.200.000 đ/tháng',
    address: 'Dân Tiến, Khoái Châu, Hưng Yên',
    university: 'ĐH Sư Phạm Kỹ Thuật Hưng Yên (UTEHY)',
    badge: 'SƯ PHẠM KỸ THUẬT',
    imageUrl: 'https://via.placeholder.com/300x200/00B14F/ffffff?text=Phong+Tro+UTEHY',
    isVerifiedHost: true,
    type: 'CHO_THUE',
  },
  {
    id: 'p2',
    title: 'Pass lại phòng chung cư mini 30m2 có ban công thoáng mát',
    price: '1.800.000 đ/tháng',
    address: 'Phường Hiến Nam, TP. Hưng Yên',
    university: 'ĐH Sư Phạm Kỹ Thuật Hưng Yên',
    badge: 'SƯ PHẠM KỸ THUẬT',
    imageUrl: 'https://via.placeholder.com/300x200/2563EB/ffffff?text=Pass+Phong+Chung+Cu',
    isVerifiedHost: false,
    type: 'PASS_PHONG',
  },
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'app1',
    postId: 'p1',
    postTitle: 'Phòng trọ khép kín full đồ gần ĐH Sư Phạm Kỹ Thuật',
    userName: 'Nguyễn Văn A',
    userPhone: '0987654321',
    timeSlot: '10:30',
    date: '18/10/2026',
    note: 'Xem phòng lúc 10h30 sáng, có thể đến sớm 10 phút.',
    status: 'PENDING',
  },
  {
    id: 'app2',
    postId: 'p1',
    postTitle: 'Phòng trọ khép kín full đồ gần ĐH Sư Phạm Kỹ Thuật',
    userName: 'Trần Thị B',
    userPhone: '0912345678',
    timeSlot: '15:00',
    date: '19/10/2026',
    note: 'Hỏi thêm về chỗ để xe máy.',
    status: 'CONFIRMED',
  },
];