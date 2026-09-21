import { mn, translateApiError } from './mn';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3071/api';

export class AuthError extends Error {
  constructor(message = mn.authRequired) {
    super(message);
    this.name = 'AuthError';
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sunia_token');
}

function clearToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sunia_token');
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    clearToken();
    throw new AuthError(translateApiError(data.error || 'Authentication required'));
  }

  if (!res.ok) {
    throw new Error(translateApiError(data.error || `Request failed (${res.status})`));
  }
  return data as T;
}

async function uploadRequest<T>(path: string, file: File, folder?: string): Promise<T> {
  const token = getToken();
  const body = new FormData();
  body.append('file', file);
  if (folder) body.append('folder', folder);

  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { method: 'POST', body, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    clearToken();
    throw new AuthError(translateApiError(data.error || 'Authentication required'));
  }

  if (res.status === 413) {
    throw new Error(translateApiError(data.error || 'Payload too large'));
  }

  if (!res.ok) {
    throw new Error(translateApiError(data.error || `Upload failed (${res.status})`));
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; admin: Admin }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ admin: Admin }>('/auth/me'),

  getDashboard: () =>
    request<{ stats: DashboardStats; recentUsers: User[] }>('/dashboard/stats'),

  getUsers: (page = 1, search = '') =>
    request<{ users: User[]; pagination: Pagination }>(
      `/users?page=${page}&search=${encodeURIComponent(search)}`
    ),

  updateUser: (id: string, data: Partial<User>) =>
    request<{ user: User }>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteUser: (id: string) =>
    request<{ message: string }>(`/users/${id}`, { method: 'DELETE' }),

  getWorkouts: () => request<{ workouts: Workout[] }>('/workouts'),

  createWorkout: (data: Partial<Workout>) =>
    request<{ workout: Workout }>('/workouts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateWorkout: (id: string, data: Partial<Workout>) =>
    request<{ workout: Workout }>(`/workouts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteWorkout: (id: string) =>
    request<{ message: string }>(`/workouts/${id}`, { method: 'DELETE' }),

  getChallenges: () => request<{ challenges: Challenge[] }>('/challenges'),

  createChallenge: (data: Partial<Challenge>) =>
    request<{ challenge: Challenge }>('/challenges', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateChallenge: (id: string, data: Partial<Challenge>) =>
    request<{ challenge: Challenge }>(`/challenges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteChallenge: (id: string) =>
    request<{ message: string }>(`/challenges/${id}`, { method: 'DELETE' }),

  getProducts: () => request<{ products: Product[] }>('/products'),

  createProduct: (data: Partial<Product>) =>
    request<{ product: Product }>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProduct: (id: string, data: Partial<Product>) =>
    request<{ product: Product }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteProduct: (id: string) =>
    request<{ message: string }>(`/products/${id}`, { method: 'DELETE' }),

  getExercises: () => request<{ exercises: Exercise[] }>('/exercises'),

  createExercise: (data: Partial<Exercise>) =>
    request<{ exercise: Exercise }>('/exercises', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateExercise: (id: string, data: Partial<Exercise>) =>
    request<{ exercise: Exercise }>(`/exercises/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteExercise: (id: string) =>
    request<{ message: string }>(`/exercises/${id}`, { method: 'DELETE' }),

  uploadImage: (file: File, folder = 'sunialt/exercises') =>
    uploadRequest<{ url: string; publicId: string }>('/uploads/image', file, folder),

  getSessions: (page = 1) =>
    request<{ sessions: WorkoutSession[]; pagination: Pagination }>(`/sessions?page=${page}`),

  deleteSession: (id: string) =>
    request<{ message: string }>(`/sessions/${id}`, { method: 'DELETE' }),

  getBadges: () => request<{ badges: Badge[] }>('/badges'),

  createBadge: (data: Partial<Badge>) =>
    request<{ badge: Badge }>('/badges', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateBadge: (id: string, data: Partial<Badge>) =>
    request<{ badge: Badge }>(`/badges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteBadge: (id: string) =>
    request<{ message: string }>(`/badges/${id}`, { method: 'DELETE' }),

  getLeaderboard: (period = 'daily') =>
    request<{ period: string; leaderboard: LeaderboardRow[] }>(`/leaderboard?period=${period}`),

  getDuels: () => request<{ duels: Duel[] }>('/duels'),

  getOrders: () => request<{ orders: Order[] }>('/orders'),

  updateOrder: (id: string, data: Partial<Order>) =>
    request<{ order: Order }>(`/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getSettings: () => request<{ settings: PaymentSettings }>('/settings'),

  updateSettings: (data: Partial<PaymentSettings>) =>
    request<{ settings: PaymentSettings }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  tagline?: string | null;
  googleId?: string | null;
  photoUrl: string | null;
  streakDays: number;
  workoutDays: number;
  completedWorkouts: number;
  earnedMinutes: number;
  todayPushUps?: number;
  totalPushUps?: number;
  isPlusSubscriber: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Workout {
  id: string;
  title: string;
  subtitle: string | null;
  level: string | null;
  tags: string[];
  type: string;
  durationMinutes: number;
  rewardMinutes: number;
  sortOrder: number;
  isPublished: boolean;
}

export interface Exercise {
  id: string;
  title: string;
  level: string;
  summary: string | null;
  description?: string | null;
  muscles: string[];
  primaryMuscles?: string | null;
  secondaryMuscles?: string | null;
  targetReps: number;
  imageUrl: string | null;
  profileImageUrl?: string | null;
  coverImageUrl?: string | null;
  videoUrl?: string | null;
  videoLabel?: string | null;
  muscleImageUrl?: string | null;
  whyPoints?: string[];
  howPoints?: string[];
  beginnerPlan?: string | null;
  standardPlan?: string | null;
  advancedPlan?: string | null;
  restNote?: string | null;
  mistakes?: string[];
  sortOrder: number;
  isPublished: boolean;
}

export interface WorkoutSession {
  id: string;
  exerciseTitle: string;
  repCount: number;
  source: string;
  completedAt: string;
  user?: { id: string; displayName: string | null; email: string };
}

export interface Challenge {
  id: string;
  name: string;
  kind?: string;
  description: string | null;
  durationDays: number;
  weeklyGoalDays: number;
  timeLimitSeconds?: number | null;
  imageUrl?: string | null;
  rewardText?: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

export interface Product {
  id: string;
  title: string;
  description: string | null;
  category?: string;
  rating?: number | string;
  reviews?: number;
  price: number | string;
  currency: string;
  imageUrl: string | null;
  imageUrls?: string[];
  stock: number;
  isPublished: boolean;
  sortOrder: number;
}

export interface Badge {
  id: string;
  key: string;
  title: string;
  subtitle: string | null;
  icon: string;
  sortOrder: number;
  isPublished: boolean;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  email?: string;
  score: number;
  sessions: number;
}

export interface Duel {
  id: string;
  opponentName: string;
  userScore: number;
  opponentScore: number;
  status: string;
  createdAt: string;
  user?: { id: string; displayName: string | null; email: string };
}

export interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number | string;
}

export interface Order {
  id: string;
  status: string;
  total: number | string;
  phone?: string | null;
  address?: string | null;
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt: string;
  user?: { id: string; displayName: string | null; email: string };
  items?: OrderItem[];
}

export interface PaymentSettings {
  qpayEnabled: boolean;
  qpayClientId: string;
  qpayClientSecret: string;
  qpayInvoiceCode: string;
  qpayBaseUrl: string;
  qpayCallbackUrl: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  plusSubscribers: number;
  totalWorkouts: number;
  totalExercises: number;
  activeChallenges: number;
  totalProducts: number;
  totalSessions: number;
  totalReps: number;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}
