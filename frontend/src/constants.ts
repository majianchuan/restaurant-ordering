import type { Role } from './types';

export const ROLE_LABELS: Record<Role, string> = {
    manager: '店长',
    chef: '厨师',
    cashier: '收银员',
};

export const ROLE_HOME: Record<Role, string> = {
    manager: '/admin',
    chef: '/kitchen',
    cashier: '/cashier',
};

/** 生产环境图片与接口同源，开发环境接口在 8000 端口。 */
export const API_ORIGIN = import.meta.env.DEV ? 'http://localhost:8000' : '';

export function assetUrl(url: string): string {
    if (!url) {
        return '';
    }
    if (/^https?:\/\//i.test(url)) {
        return url;
    }
    return `${API_ORIGIN}${url}`;
}

export function formatMoney(value: number | string): string {
    return Number(value).toFixed(2);
}
