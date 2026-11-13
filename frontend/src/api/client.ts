import axios, { AxiosError } from 'axios';
import type {
    CartItemPayload,
    CreateUserPayload,
    DiningTable,
    LoginResponse,
    MenuItem,
    MenuItemPayload,
    Order,
    StaffAccount,
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

export const authApi = {
    login: async (username: string, password: string): Promise<LoginResponse> => {
        const { data } = await api.post<LoginResponse>('/auth/login', { username, password });
        return data;
    },
    me: async (): Promise<User> => {
        const { data } = await api.get<User>('/auth/me');
        return data;
    },
    changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
        await api.post('/auth/password', { currentPassword, newPassword });
    },
};

export const userApi = {
    list: async (): Promise<StaffAccount[]> => {
        const { data } = await api.get<StaffAccount[]>('/users');
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
    list: async (): Promise<MenuItem[]> => {
        const { data } = await api.get<MenuItem[]>('/menu');
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
