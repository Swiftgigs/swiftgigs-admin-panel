export type Paged<T> = { success: boolean; data: T[]; total: number; page: number; limit: number };

export type Admin = { _id: string; name: string; email: string; role: "super_admin" | "admin"; isActive: boolean; lastLoginAt?: string; createdAt?: string };

export type VerificationRow = {
  kind: "provider" | "client";
  id: string;
  name: string;
  phone: string;
  tier: string;
  service: string;
  nameMatchResult: string;
  nameMatchHits: number | null;
  payoutNameMatched: boolean | null;
  payoutAccountName: string;
  kycVendor: string;
  kycRef: string;
  ninVerifiedAt: string | null;
  strikes: number;
  affectedJobs: number;
  registeredAt: string | null;
};

export type HeldJob = {
  _id: string;
  service_type: string;
  serviceproviderId: string;
  serviceRequesterId: string;
  agreed_price: number;
  client_location?: { address?: string };
  risk_score?: number;
  risk_flags?: string[];
};

export type Provider = {
  _id: string;
  name: string;
  business_name?: string;
  phone_number: string;
  service_type: string;
  service_category?: string;
  services?: string[];
  verification?: { tier?: string; name_match_result?: string; kyc_vendor?: string };
  strikes?: number;
  rating?: number;
  jobs_completed?: number;
  availability_status?: "online" | "offline";
  has_nin: boolean;
  banned: boolean;
  registered_at?: string;
};

export type ProviderDetail = Provider & {
  alt_phone_number?: string;
  emergency_contact?: string;
  bank_name?: string;
  account_name?: string;
  account_number_masked?: string;
  location?: { address?: string };
  ban: { reason?: string; banned_at?: string; banned_by?: string } | null;
  recent_jobs: { _id: string; service_type: string; agreed_price: number; status: string; escrow_status: string; createdAt: string }[];
};

export type Client = {
  _id: string;
  name?: string;
  phone_number: string;
  verification?: { tier?: string; name_match_result?: string };
  safety_flags?: number;
  jobs_requested: number;
  has_nin: boolean;
  banned: boolean;
  createdAt?: string;
};

export type Job = {
  _id: string;
  service_type: string;
  serviceproviderId: string;
  serviceRequesterId: string;
  agreed_price?: number;
  status: string;
  escrow_status: string;
  dispute_status?: string;
  risk_decision?: string;
  risk_score?: number;
  paystack_reference?: string;
  createdAt: string;
};

export type CareAgent = {
  _id: string;
  phoneNumber: string;
  name: string;
  email?: string;
  taskStatus: "inactive" | "active" | "busy";
  completedResolutions: number;
  activeDisputesById: string[];
  decisionStats: { release: number; split: number; refund: number };
  ratingSummary: { average: number; totalRatings: number };
  lastResolvedAt?: string;
};

type Evidence = { description?: string; media: string[] };

export type Dispute = {
  _id: string;
  jobId: string;
  clientId: string;
  serviceProviderId: string;
  customerCareId: string | null;
  status: "open" | "awaiting_provider_evidence" | "awaiting_customer_care_review" | "resolved";
  createdAt: string;
  providerEvidenceDueAt?: string;
  jobSnapshot?: { serviceType?: string; agreedPrice?: number; escrowStatus?: string };
  clientEvidence: Evidence;
  providerEvidence: Evidence;
  resolution?: { decision?: string; decidedAt?: string; decidedBy?: string; note?: string };
};

export type ServiceItem = { category: string; slug: string; service: string; description?: string };

export type BlogPost = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  category: string;
  tags: string[];
  cover_image_url: string;
  author_name: string;
  read_time_minutes: number;
  seo_title: string;
  seo_description: string;
  status: "draft" | "published" | "archived";
  published_at?: string;
  updatedAt: string;
};

export type Fees = {
  commissionRate: number;
  commissionCapNgn: number;
  commissionStartDate: string;
  source: "database" | "environment";
  defaults: { commissionRate: number; commissionCapNgn: number; commissionStartDate: string };
};

export type Stats = {
  providers: { total: number; verified: number; failed: number; inReview: number };
  clients: { total: number; verified: number; failed: number };
  jobs: {
    byStatus: Record<string, number>;
    byEscrow: Record<string, { count: number; amount: number }>;
    riskHeld: number;
    perDay: { date: string; count: number }[];
  };
  disputes: { open: number; awaitingReview: number };
  customerCare: { total: number; active: number };
  blog: { published: number; drafts: number };
  services: number;
  blocked: number;
  fees: { commissionRate: number; commissionCapNgn: number };
};
