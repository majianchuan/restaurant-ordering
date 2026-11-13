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

export interface MenuItem {
    id: number;
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
    price: number;
    description: string;
    imageUrl: string;
}

export interface CartItemPayload {
    menuItemId: number;
    quantity: number;
}
