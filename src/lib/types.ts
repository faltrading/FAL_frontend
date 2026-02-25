export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  role: "user" | "admin";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenPayload {
  sub: string;
  username: string;
  role: "user" | "admin";
  exp: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  max_members: number;
  invite_code: string | null;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  username: string;
  role: "admin" | "moderator" | "member";
  joined_at: string;
}

export interface ChatMessage {
  id: string;
  group_id: string;
  sender_id: string;
  sender_username: string;
  content: string;
  message_type: "text" | "system" | "announcement";
  reply_to_id: string | null;
  reply_to_content: string | null;
  reply_to_username: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: string;
  room_name: string;
  created_by: string;
  creator_username: string;
  status: "active" | "ended";
  started_at: string;
  ended_at: string | null;
  max_participants: number;
}

export interface CallParticipant {
  id: string;
  call_id: string;
  user_id: string;
  username: string;
  role: "moderator" | "participant";
  joined_at: string;
  left_at: string | null;
}

export interface JoinCallResponse {
  call: Call;
  participant: CallParticipant;
  jitsi_jwt: string;
  jitsi_room: string;
  jitsi_domain: string;
}

export interface CalendarSettings {
  id: string;
  slot_duration_minutes: number;
  min_notice_minutes: number;
  timezone: string;
}

export interface CalendarSlot {
  id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

export interface Booking {
  id: string;
  slot_id: string;
  user_id: string;
  username: string;
  notes: string | null;
  status: "confirmed" | "cancelled";
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface PaymentPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: "monthly" | "yearly" | "one_time";
  is_active: boolean;
  features: string[];
}

export interface BrokerConnection {
  id: string;
  user_id: string;
  provider: string;
  account_identifier: string;
  connection_status: "active" | "inactive" | "error";
  last_sync_at: string | null;
  created_at: string;
}

export interface BrokerTrade {
  id: string;
  connection_id: string;
  symbol: string;
  side: "buy" | "sell";
  volume: number;
  open_price: number;
  close_price: number | null;
  open_time: string;
  close_time: string | null;
  pnl: number | null;
  status: "open" | "closed";
}

export interface DailyStat {
  date: string;
  total_pnl: number;
  trade_count: number;
  win_count: number;
  loss_count: number;
}

export interface DashboardData {
  kpi: {
    total_pnl: number;
    win_rate: number;
    profit_factor: number;
    total_trades: number;
    average_win: number;
    average_loss: number;
    max_drawdown: number;
  };
  daily_pnl: DailyStat[];
  recent_trades: BrokerTrade[];
  open_positions: BrokerTrade[];
}

export interface NewsEvent {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
  actual?: string;
}

export interface GalleryFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category: string;
  uploaded_by: string;
  created_at: string;
}
