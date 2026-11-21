export type Role = 'manager' | 'chef' | 'cashier';

export interface User {
    id: number;
    username: string;
    nickname: string;
    role: Role;
    createdAt?: string;
}

export interface StaffAccount extends User {
    roleLabel: string;
}

export interface LoginResponse {
    token: string;
    user: User;
}

export interface DiningTable {
    id: number;
    name: string;
    publicCode: string;
    createdAt?: string;
}

export interface MenuCategory {
    id: number;
    name: string;
}

export interface MenuItem {
    id: number;
    categoryId: number;
    category: string;
    name: string;
    price: string;
    description: string;
    imageUrl: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface OrderItem {
    id: number;
    menuItemId: number;
    name: string;
    price: string;
    quantity: number;
    done: boolean;
}

export type OrderStatus = 'pending' | 'paid';

export interface Order {
    id: number;
    tableId: number;
    tableName?: string | null;
    status: OrderStatus;
    createdAt: string;
    updatedAt: string;
    paidAt: string | null;
    totalAmount: string;
    totalQuantity: number;
    doneCount: number;
    undoneCount: number;
    items: OrderItem[];
}

export interface TableOverview extends DiningTable {
    order: Order | null;
}

export interface TableInfo {
    id: number;
    name: string;
    publicCode: string;
}

export interface TableOrderResponse {
    table: TableInfo;
    order: Order | null;
}

export interface CreateUserPayload {
    role: 'chef' | 'cashier';
    username: string;
    nickname: string;
    password: string;
}

export interface MenuItemPayload {
    name: string;
    categoryId: number;
    price: number;
    description: string;
    imageUrl: string;
}

export interface CartItemPayload {
    menuItemId: number;
    quantity: number;
}

export interface AdminOrderSummary {
    id: number;
    status: OrderStatus;
    tableName: string;
    totalAmount: string;
    totalQuantity: number;
    createdAt: string;
    paidAt: string | null;
}

export interface AdminOrdersResponse {
    items: AdminOrderSummary[];
    total: number;
    page: number;
    pageSize: number;
    pages: number;
}

export interface StatsResponse {
    today: {
        revenue: string;
        orders: number;
        activeOrders: number;
    };
    counts: {
        menu: number;
        tables: number;
        categories: number;
    };
    statusCounts: Record<OrderStatus, number>;
    week: Array<{ date: string; label: string; orders: number; revenue: string }>;
    topDishes: Array<{ name: string; quantity: number; revenue: string }>;
}
