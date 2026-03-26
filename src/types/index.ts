// ===== Enums (matching DB exactly) =====
export type UserRole = 'admin' | 'jury' | 'user';
export type EditionStatus = 'draft' | 'open' | 'judging' | 'completed';
export type SubmissionStatus = 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'disqualified';
export type PaymentStatus = 'pending' | 'completed' | 'refunded' | 'failed';
export type ScoringPhase = 'phase1' | 'phase2';
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

// ===== Database Models (matching DB schema exactly) =====
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  country: string | null;
  bio: string | null;
  website: string | null;
  instagram: string | null;
  created_at: string;
  updated_at: string;
}

export interface Edition {
  id: string;
  title: string;
  slug: string;
  year: number;
  description: string | null;
  theme: string | null;
  theme_description: string | null;
  hero_image_url: string | null;
  status: EditionStatus;
  submission_start: string | null;
  submission_end: string | null;
  scoring_phase: ScoringPhase;
  rules: string | null;
  prizes: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  edition_id: string;
  name: string;
  description: string | null;
  max_photos: number;
  price: number;
  sort_order: number;
  created_at: string;
}

export interface Submission {
  id: string;
  user_id: string;
  edition_id: string;
  category_id: string;
  title: string | null;
  description: string | null;
  status: SubmissionStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  photos?: SubmissionPhoto[];
  category?: Category;
  edition?: Edition;
  profile?: Profile;
  scores?: Score[];
  payment?: Payment;
}

export type PhotoReviewStatus = 'pending' | 'approved' | 'rejected';

export interface SubmissionPhoto {
  id: string;
  submission_id: string;
  storage_key: string;
  thumbnail_key: string | null;
  original_filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  exif_data: Record<string, unknown> | null;
  sort_order: number;
  status: PhotoReviewStatus;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

export interface Score {
  id: string;
  submission_id: string;
  photo_id: string | null;
  jury_id: string;
  phase: ScoringPhase;
  score: number | null;
  rank: number | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  jury_profile?: Profile;
}

export interface Payment {
  id: string;
  submission_id: string | null;
  user_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  paypal_payer_email: string | null;
  metadata: Record<string, unknown> | null;
  tier_id: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  created_at: string;
}

export interface PricingTier {
  id: string;
  edition_id: string;
  name: string;
  photo_credits: number;
  price: number;
  is_bundle: boolean;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface UserCredit {
  id: string;
  user_id: string;
  edition_id: string;
  tier_id: string;
  photo_credits: number;
  submissions_remaining: number;
  created_at: string;
  // Joined
  tier?: PricingTier;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface Page {
  id: string;
  slug: string;
  title_en: string | null;
  title_al: string | null;
  content_en: string | null;
  content_al: string | null;
  updated_at: string;
}

export interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface Certificate {
  id: string;
  submission_id: string;
  user_id: string;
  edition_id: string;
  type: string;
  file_url: string | null;
  created_at: string;
}

export interface JuryAssignment {
  id: string;
  jury_id: string;
  edition_id: string;
  category_id: string;
  assigned_at: string;
  // Joined
  jury_profile?: Profile;
  edition?: Edition;
  category?: Category;
}

export type PostCategory = 'news' | 'event' | 'announcement';

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  cover_image_url: string | null;
  gallery_images: string[];
  facebook_url: string | null;
  category: PostCategory;
  featured: boolean;
  pinned: boolean;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// ===== API / Component Types =====
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface EditionWithCategories extends Edition {
  categories: Category[];
}

export interface SubmissionWithDetails extends Submission {
  photos: SubmissionPhoto[];
  category: Category;
  edition: Edition;
  profile: Profile;
  scores: Score[];
}

export interface DashboardStats {
  totalUsers: number;
  totalSubmissions: number;
  totalPayments: number;
  totalRevenue: number;
  pendingReviews: number;
  activeEditions: number;
}

export interface JuryProgress {
  juryId: string;
  juryName: string;
  totalAssigned: number;
  totalScored: number;
  percentage: number;
}
