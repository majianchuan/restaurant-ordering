import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    App as AntdApp,
    Button,
    Card,
    Empty,
    Result,
    Spin,
} from 'antd';
import { CoffeeOutlined, PictureOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { QuantityEditor } from '../components/QuantityEditor';
import { assetUrl } from '../constants';
import { getErrorMessage, menuApi, orderApi } from '../api/client';
import type { MenuItem, Order, TableInfo } from '../types';

type Cart = Record<number, number>;

interface MenuGroup {
    id: number;
    name: string;
    items: MenuItem[];
}

const POLL_INTERVAL = 5000;

function cartFromOrder(order: Order | null, allowedMenuIds?: Set<number>): Cart {
    const cart: Cart = {};
    order?.items.forEach((item) => {
        if (allowedMenuIds && allowedMenuIds.size > 0 && !allowedMenuIds.has(item.menuItemId)) {
            return;
        }
        cart[item.menuItemId] = item.quantity;
    });
    return cart;
}

export function OrderPage() {
    const { code } = useParams<{ code: string }>();
    const { message } = AntdApp.useApp();

    const [table, setTable] = useState<TableInfo | null>(null);
    const [order, setOrder] = useState<Order | null>(null);
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [cart, setCart] = useState<Cart>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [externalUpdate, setExternalUpdate] = useState(false);
    const [activeCategory, setActiveCategory] = useState<number | null>(null);

    const cartRef = useRef<Cart>({});
    const snapshotRef = useRef<string>('{}');
    const dirtyRef = useRef<boolean>(false);
    const menuIdsRef = useRef<Set<number>>(new Set());
    const sectionRefs = useRef<Record<number, HTMLElement | null>>({});

    const applyOrder = useCallback((nextOrder: Order | null) => {
        const nextCart = cartFromOrder(nextOrder, menuIdsRef.current);
        setOrder(nextOrder);
        setCart(nextCart);
        cartRef.current = nextCart;
        snapshotRef.current = JSON.stringify(nextCart);
        dirtyRef.current = false;
        setExternalUpdate(false);
    }, []);

    useEffect(() => {
        if (!code) {
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        Promise.all([orderApi.byTable(code), menuApi.list()])
            .then(([tableData, menuData]) => {
                if (cancelled) {
                    return;
                }
                setTable(tableData.table);
                menuIdsRef.current = new Set(menuData.map((item) => item.id));
                setMenu(menuData);
                applyOrder(tableData.order);
            })
            .catch((loadError) => {
                if (!cancelled) {
                    setError(getErrorMessage(loadError, '无法加载点餐页面'));
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [code, applyOrder]);

    useEffect(() => {
        if (!code || error) {
            return;
        }

        const timer = window.setInterval(async () => {
            try {
                const tableData = await orderApi.byTable(code);
                setTable(tableData.table);
                setOrder(tableData.order);

                const nextCart = cartFromOrder(tableData.order, menuIdsRef.current);
                const nextSnapshot = JSON.stringify(nextCart);

                if (nextSnapshot !== snapshotRef.current) {
                    snapshotRef.current = nextSnapshot;
                    if (!dirtyRef.current) {
                        setCart(nextCart);
                        cartRef.current = nextCart;
                        setExternalUpdate(false);
                    } else {
                        setExternalUpdate(true);
                    }
                }
            } catch {
                // 轮询失败时静默处理，等待下一次刷新
            }
        }, POLL_INTERVAL);

        return () => window.clearInterval(timer);
    }, [code, error]);

    const groups = useMemo<MenuGroup[]>(() => {
        const grouped = new Map<number, MenuGroup>();

        menu.forEach((item) => {
            const group = grouped.get(item.categoryId) ?? {
                id: item.categoryId,
                name: item.category,
                items: [],
            };
            group.items.push(item);
            grouped.set(item.categoryId, group);
        });

        return Array.from(grouped.values()).sort((a, b) => a.id - b.id);
    }, [menu]);

    useEffect(() => {
        if (activeCategory === null && groups.length > 0) {
            setActiveCategory(groups[0].id);
        }
    }, [activeCategory, groups]);

    const jumpToCategory = (categoryId: number) => {
        setActiveCategory(categoryId);
        sectionRefs.current[categoryId]?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };

    const updateQuantity = (menuItemId: number, value: number) => {
        const normalized = Math.max(
            0,
            Math.min(99, Math.floor(Number.isFinite(value) ? value : 0))
        );
        const nextCart = { ...cartRef.current };

        if (normalized === 0) {
            delete nextCart[menuItemId];
        } else {
            nextCart[menuItemId] = normalized;
        }

        cartRef.current = nextCart;
        setCart(nextCart);
        dirtyRef.current = true;
    };

    const handleSubmit = async () => {
        if (!code) {
            return;
        }

        const items = Object.entries(cartRef.current)
            .map(([menuItemId, quantity]) => ({
                menuItemId: Number(menuItemId),
                quantity,
            }))
            .filter(
                (item) =>
                    item.quantity > 0 &&
                    (menuIdsRef.current.size === 0 ||
                        menuIdsRef.current.has(item.menuItemId))
            );

        if (items.length === 0) {
            message.warning('请先选择菜品');
            return;
        }

        setSubmitting(true);
        try {
            const tableData = await orderApi.submit(code, items);
            setTable(tableData.table);
            applyOrder(tableData.order);
            message.success('订单已提交，后厨已收到');
        } catch (submitError) {
            message.error(getErrorMessage(submitError));
        } finally {
            setSubmitting(false);
        }
    };

    const totalQuantity = Object.values(cart).reduce((sum, value) => sum + value, 0);
    const totalAmount = menu.reduce(
        (sum, item) => sum + Number(item.price) * (cart[item.id] ?? 0),
        0
    );

    if (loading) {
        return (
            <div className="order-page">
                <div className="page-loading">
                    <Spin size="large" />
                </div>
            </div>
        );
    }

    if (error || !table) {
        return (
            <div className="order-page order-page-center">
                <Result
                    status="404"
                    title="无法打开点餐页面"
                    subTitle={error ?? '餐桌不存在或二维码无效'}
                    extra={
                        <Button type="primary" onClick={() => window.location.reload()}>
                            重新加载
                        </Button>
                    }
                />
            </div>
        );
    }

    return (
        <div className="order-page">
            <header className="order-header">
                <div>
                    <div className="order-table-name">{table.name}</div>
                    <div className="order-subtitle">扫码点餐 · 提交后后厨立即收到</div>
                </div>
                <div className="order-header-actions">
                    <span className="order-header-badge">
                        <CoffeeOutlined /> 堂食
                    </span>
                </div>
            </header>

            <main className="order-container">
                {externalUpdate && (
                    <Alert
                        className="order-sync-alert"
                        type="warning"
                        showIcon
                        message="其他设备已更新了这张餐桌的点餐内容"
                        description="你本地还有未提交的修改，继续提交将覆盖对方的选择。"
                    />
                )}

                {order && (
                    <div className="order-current">
                        <span>当前订单 #{order.id} 已提交</span>
                        <span className="order-current-hint">修改数量后再次提交即可覆盖</span>
                    </div>
                )}

                {menu.length === 0 ? (
                    <Empty className="order-empty" description="菜单暂时为空，请稍后再来" />
                ) : (
                    <div className="order-layout">
                        <aside className="order-category-sidebar">
                            <div className="order-category-title">菜品分类</div>
                            {groups.map((group) => (
                                <button
                                    key={group.id}
                                    type="button"
                                    className={`order-category-item${
                                        activeCategory === group.id ? ' is-active' : ''
                                    }`}
                                    onClick={() => jumpToCategory(group.id)}
                                >
                                    {group.name}
                                </button>
                            ))}
                        </aside>

                        <div className="order-menu-sections">
                            {groups.map((group) => (
                                <section
                                    key={group.id}
                                    ref={(element) => {
                                        sectionRefs.current[group.id] = element;
                                    }}
                                    className="menu-category-section"
                                >
                                    <h2 className="menu-category-heading">{group.name}</h2>
                                    <div className="card-grid menu-grid">
                                        {group.items.map((item) => {
                                            const quantity = cart[item.id] ?? 0;

                                            return (
                                                <Card
                                                    key={item.id}
                                                    className={`menu-item-card${
                                                        quantity > 0 ? ' is-selected' : ''
                                                    }`}
                                                    cover={
                                                        <div className="menu-cover">
                                                            {item.imageUrl ? (
                                                                <img
                                                                    src={assetUrl(item.imageUrl)}
                                                                    alt={item.name}
                                                                    loading="lazy"
                                                                />
                                                            ) : (
                                                                <div className="menu-cover-placeholder">
                                                                    <PictureOutlined />
                                                                </div>
                                                            )}
                                                            {quantity > 0 && (
                                                                <span className="menu-selected-badge">
                                                                    已选 {quantity}
                                                                </span>
                                                            )}
                                                        </div>
                                                    }
                                                >
                                                    <div className="menu-item-title-row">
                                                        <h3>{item.name}</h3>
                                                        <span className="menu-price">
                                                            ¥{item.price}
                                                        </span>
                                                    </div>
                                                    <p className="menu-desc">
                                                        {item.description || '暂无描述'}
                                                    </p>
                                                    <div className="menu-item-actions">
                                                        <span className="menu-unit">
                                                            {item.category} · ¥{item.price} / 份
                                                        </span>
                                                        <QuantityEditor
                                                            value={quantity}
                                                            onChange={(value) =>
                                                                updateQuantity(item.id, value)
                                                            }
                                                        />
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <div className="order-bottom-bar">
                <div className="order-total">
                    <span>已选 {totalQuantity} 份</span>
                    <strong>¥{totalAmount.toFixed(2)}</strong>
                </div>

                <div className="order-submit-area">
                    <span className="order-submit-hint">提交后仍可修改并再次提交</span>
                    <Button
                        type="primary"
                        size="large"
                        className="order-submit"
                        loading={submitting}
                        disabled={totalQuantity === 0}
                        onClick={() => void handleSubmit()}
                    >
                        提交订单
                    </Button>
                </div>
            </div>
        </div>
    );
}
