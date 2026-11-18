export type Role = 'manager' | 'chef' | 'cashier' | 'customer';

export interface User {
    id: number;
    username: string;
    nickname: string;
    phone?: string;
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

export interface RegisterPayload {
    username: string;
    password: string;
    nickname: string;
    phone?: string;
}

export interface ProfilePayload {
    nickname: string;
    phone?: string;
}

export interface DiningTable {
    id: number;
    name: string;
    publicCode: string;
    createdAt?: string;
}

export interface MenuItem {
    id: number;
    name: string;
    category: string;
    price: string;
    description: string;
    imageUrl: string;
    rating: number;
    reviewCount: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface Review {
    id: number;
    orderId?: number;
    menuItemId?: number;
    menuName?: string;
    imageUrl?: string;
    nickname?: string;
    rating: number;
    content: string;
    createdAt: string;
}

export interface OrderItem {
    id: number;
    menuItemId: number;
    name: string;
    price: string;
    quantity: number;
    done: boolean;
    review?: Review | null;
}

export type OrderStatus = 'pending' | 'served' | 'paid';

export interface Order {
    id: number;
    tableId: number;
    tableName?: string | null;
    customerId?: number | null;
    customerName?: string | null;
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
    category: string;
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
    customerName: string | null;
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
        customers: number;
    };
    counts: {
        menu: number;
        tables: number;
        customers: number;
    };
    statusCounts: Record<OrderStatus, number>;
    week: Array<{ date: string; label: string; orders: number; revenue: string }>;
    topDishes: Array<{ name: string; quantity: number; revenue: string }>;
    recentReviews: Review[];
}
