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
  is_default: boolean;
  is_public: boolean;
  member_count: number;
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
  message_type: "text" | "system" | "announcement" | "image" | "audio" | "video" | "file";
  reply_to_id: string | null;
  reply_to_content: string | null;
  reply_to_username: string | null;
  metadata: Record<string, unknown>;
  is_edited: boolean;
  is_deleted: boolean;
  is_pinned: boolean;
  pinned_at: string | null;
  pinned_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: string;
  room_name: string;
  created_by: string;
  creator_username: string;
  is_active?: boolean;
  status: "active" | "ended";
  started_at: string | null;
  created_at?: string;
  ended_at: string | null;
  max_participants: number | null;
  participant_count?: number;
}

export interface CallParticipant {
  id: string;
  call_id?: string;
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
  jitsi_room_url?: string;
}

export interface CalendarSettings {
  id: string;
  default_start_time: string;
  default_end_time: string;
  timezone: string;
  min_booking_notice_minutes: number | null;
  max_advance_booking_days: number | null;
  allow_cancellation: boolean;
  cancellation_notice_minutes: number | null;
  allow_booking_outside_availability: boolean;
}

export interface AvailabilityDay {
  day_of_week: number; // 0=Mon … 6=Sun
  is_enabled: boolean;
  start_time: string;  // HH:MM
  end_time: string;
}

export interface AvailabilityOverride {
  id: string;
  override_date: string;
  is_closed: boolean;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicDayAvailability {
  date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
  is_override: boolean;
  notes: string | null;
}

export interface PublicAvailabilityResponse {
  general: AvailabilityDay[];
  overrides: AvailabilityOverride[];
  days: PublicDayAvailability[];
  allow_booking_outside_availability: boolean;
}

export interface Booking {
  id: string;
  user_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: "confirmed" | "cancelled";
  cancelled_at: string | null;
  notes: string | null;
  created_at: string;
  username?: string;
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
  metadata: Record<string, unknown>;
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
  commission?: number;
  swap?: number;
  status: "open" | "closed";
  metadata?: Record<string, unknown>;
}

export interface DailyStat {
  date: string;
  total_pnl: number;
  cumulative_pnl: number;
  trade_count?: number;
  win_count?: number;
  loss_count?: number;
  winning_trades?: number;
  losing_trades?: number;
  volume?: number;
}

export interface DashboardRecentTrade {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  volume: number;
  pnl: number | null;
  close_time: string | null;
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
    day_win_rate?: number;
    avg_win_loss_ratio?: number;
  };
  daily_pnl: DailyStat[];
  recent_trades: DashboardRecentTrade[];
  open_positions: Array<{
    symbol: string;
    side: string;
    open_time: string;
    open_price: number;
    volume: number;
    current_pnl: number | null;
  }>;
  last_sync_at: string | null;
  provider: string;
  account_identifier: string;
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
