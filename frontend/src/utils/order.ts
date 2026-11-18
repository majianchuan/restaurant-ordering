import type { Order } from '../types';

export type TableStatusKey = 'empty' | 'pending' | 'ready' | 'paid';

export interface TableStatus {
    key: TableStatusKey;
    label: string;
    color: string;
}

export function getTableStatus(order: Order | null): TableStatus {
    if (!order) {
        return { key: 'empty', label: '未点餐', color: 'default' };
    }

    if (order.status === 'paid') {
        return { key: 'paid', label: '已结账', color: 'default' };
    }

    if (order.status === 'served' || order.undoneCount === 0) {
        return { key: 'ready', label: '已上齐', color: 'green' };
    }

    return { key: 'pending', label: '制作中', color: 'orange' };
}

export function getCashierStatus(order: Order | null): TableStatus {
    if (!order) {
        return { key: 'empty', label: '未点餐', color: 'default' };
    }

    if (order.status === 'paid') {
        return { key: 'paid', label: '已结账', color: 'default' };
    }

    return { key: 'pending', label: '待结账', color: 'blue' };
}
