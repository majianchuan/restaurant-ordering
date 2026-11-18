import axios, { AxiosError } from 'axios';
import type {
    AdminOrdersResponse,
    CartItemPayload,
    CreateUserPayload,
    DiningTable,
    LoginResponse,
    MenuItem,
    MenuItemPayload,
    Order,
    ProfilePayload,
    RegisterPayload,
    Review,
    StaffAccount,
    StatsResponse,
    TableOrderResponse,
    TableOverview,
    User,
} from '../types';

export const API_BASE = import.meta.env.DEV ? 'http://localhost:8000/api' : '/api';

export const TOKEN_KEY = 'restaurant-ordering-token';

export const api = axios.create({
    baseURL: API_BASE,
    timeout: 15000,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401 && window.location.pathname !== '/login') {
            localStorage.removeItem(TOKEN_KEY);
            window.location.replace('/login');
        }
        return Promise.reject(error);
    }
);

export function getErrorMessage(error: unknown, fallback = '操作失败，请稍后重试'): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { message?: string } | undefined;
        if (data?.message) {
            return data.message;
        }
        if (error.code === 'ECONNABORTED') {
            return '请求超时，请稍后重试';
        }
        if (!error.response) {
            return '无法连接服务器，请确认后端服务已启动';
        }
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
}

function queryString(params: Record<string, string | number | undefined>): string {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
            query.set(key, String(value));
        }
    });
    const text = query.toString();

    return text ? `?${text}` : '';
}

export const authApi = {
    login: async (username: string, password: string): Promise<LoginResponse> => {
        const { data } = await api.post<LoginResponse>('/auth/login', { username, password });
        return data;
    },
    register: async (payload: RegisterPayload): Promise<LoginResponse> => {
        const { data } = await api.post<LoginResponse>('/auth/register', payload);
        return data;
    },
    me: async (): Promise<User> => {
        const { data } = await api.get<User>('/auth/me');
        return data;
    },
    updateProfile: async (payload: ProfilePayload): Promise<User> => {
        const { data } = await api.patch<User>('/profile', payload);
        return data;
    },
    changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
        await api.post('/auth/password', { currentPassword, newPassword });
    },
};

export const userApi = {
    list: async (params: { role?: string; keyword?: string } = {}): Promise<StaffAccount[]> => {
        const { data } = await api.get<StaffAccount[]>(`/users${queryString(params)}`);
        return data;
    },
    create: async (payload: CreateUserPayload): Promise<StaffAccount> => {
        const { data } = await api.post<StaffAccount>('/users', payload);
        return data;
    },
    remove: async (id: number): Promise<void> => {
        await api.delete(`/users/${id}`);
    },
};

export const tableApi = {
    list: async (): Promise<DiningTable[]> => {
        const { data } = await api.get<DiningTable[]>('/tables');
        return data;
    },
    create: async (): Promise<DiningTable> => {
        const { data } = await api.post<DiningTable>('/tables');
        return data;
    },
    rename: async (id: number, name: string): Promise<DiningTable> => {
        const { data } = await api.patch<DiningTable>(`/tables/${id}`, { name });
        return data;
    },
    remove: async (id: number): Promise<void> => {
        await api.delete(`/tables/${id}`);
    },
};

export const menuApi = {
    list: async (params: { category?: string; keyword?: string } = {}): Promise<MenuItem[]> => {
        const { data } = await api.get<MenuItem[]>(`/menu${queryString(params)}`);
        return data;
    },
    categories: async (): Promise<string[]> => {
        const { data } = await api.get<string[]>('/menu/categories');
        return data;
    },
    reviews: async (menuItemId: number): Promise<Review[]> => {
        const { data } = await api.get<Review[]>(`/menu/${menuItemId}/reviews`);
        return data;
    },
    create: async (payload: MenuItemPayload): Promise<MenuItem> => {
        const { data } = await api.post<MenuItem>('/menu', payload);
        return data;
    },
    update: async (id: number, payload: MenuItemPayload): Promise<MenuItem> => {
        const { data } = await api.put<MenuItem>(`/menu/${id}`, payload);
        return data;
    },
    remove: async (id: number): Promise<void> => {
        await api.delete(`/menu/${id}`);
    },
};

export const uploadApi = {
    image: async (file: File): Promise<{ url: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await api.post<{ url: string }>('/uploads', formData);
        return data;
    },
};

export const orderApi = {
    overview: async (): Promise<TableOverview[]> => {
        const { data } = await api.get<TableOverview[]>('/tables/overview');
        return data;
    },
    byTable: async (code: string): Promise<TableOrderResponse> => {
        const { data } = await api.get<TableOrderResponse>(`/orders/table/${code}`);
        return data;
    },
    submit: async (code: string, items: CartItemPayload[]): Promise<TableOrderResponse> => {
        const { data } = await api.put<TableOrderResponse>(`/orders/table/${code}`, { items });
        return data;
    },
    toggleItem: async (id: number, done: boolean): Promise<void> => {
        await api.patch(`/order-items/${id}`, { done });
    },
    pay: async (id: number): Promise<Order> => {
        const { data } = await api.post<Order>(`/orders/${id}/pay`);
        return data;
    },
};

export const customerApi = {
    myOrders: async (): Promise<Order[]> => {
        const { data } = await api.get<Order[]>('/my/orders');
        return data;
    },
    favorites: async (): Promise<MenuItem[]> => {
        const { data } = await api.get<MenuItem[]>('/my/favorites');
        return data;
    },
    toggleFavorite: async (menuItemId: number): Promise<{ favorited: boolean }> => {
        const { data } = await api.post<{ favorited: boolean }>(`/my/favorites/${menuItemId}`);
        return data;
    },
    myReviews: async (): Promise<Review[]> => {
        const { data } = await api.get<Review[]>('/my/reviews');
        return data;
    },
    createReview: async (
        orderId: number,
        payload: { menuItemId: number; rating: number; content: string }
    ): Promise<Review> => {
        const { data } = await api.post<Review>(`/my/orders/${orderId}/reviews`, payload);
        return data;
    },
};

export const adminApi = {
    orders: async (params: {
        keyword?: string;
        status?: string;
        page?: number;
        pageSize?: number;
    }): Promise<AdminOrdersResponse> => {
        const { data } = await api.get<AdminOrdersResponse>(`/admin/orders${queryString(params)}`);
        return data;
    },
    orderDetail: async (id: number): Promise<Order> => {
        const { data } = await api.get<Order>(`/admin/orders/${id}`);
        return data;
    },
    stats: async (): Promise<StatsResponse> => {
        const { data } = await api.get<StatsResponse>('/admin/stats');
        return data;
    },
};
