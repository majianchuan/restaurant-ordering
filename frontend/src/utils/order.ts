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

    if (order.undoneCount > 0) {
        return { key: 'pending', label: '制作中', color: 'orange' };
    }

    return { key: 'ready', label: '已上齐', color: 'green' };
}
