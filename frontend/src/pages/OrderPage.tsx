import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    App as AntdApp,
    Button,
    Card,
    Empty,
    Modal,
    Rate,
    Result,
    Spin,
} from 'antd';
import { HeartFilled, HeartOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import { QuantityEditor } from '../components/QuantityEditor';
import { assetUrl } from '../constants';
import { customerApi, getErrorMessage, menuApi, orderApi } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { MenuItem, Order, Review, TableInfo } from '../types';

type Cart = Record<number, number>;

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
    const { user } = useAuth();
    const { message } = AntdApp.useApp();

    const [table, setTable] = useState<TableInfo | null>(null);
    const [order, setOrder] = useState<Order | null>(null);
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [cart, setCart] = useState<Cart>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [externalUpdate, setExternalUpdate] = useState(false);
    const [favorites, setFavorites] = useState<Set<number>>(new Set());
    const [activeCategory, setActiveCategory] = useState('全部');
    const [reviewItem, setReviewItem] = useState<MenuItem | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);

    const cartRef = useRef<Cart>({});
    const snapshotRef = useRef<string>('{}');
    const dirtyRef = useRef<boolean>(false);
    const menuIdsRef = useRef<Set<number>>(new Set());

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

    useEffect(() => {
        if (user?.role !== 'customer') {
            setFavorites(new Set());
            return;
        }

        customerApi
            .favorites()
            .then((items) => setFavorites(new Set(items.map((item) => item.id))))
            .catch(() => {
                // 收藏加载失败不影响点餐
            });
    }, [user]);

    const categories = useMemo(
        () => ['全部', ...Array.from(new Set(menu.map((item) => item.category)))],
        [menu]
    );

    const visibleMenu = useMemo(
        () =>
            activeCategory === '全部'
                ? menu
                : menu.filter((item) => item.category === activeCategory),
        [activeCategory, menu]
    );

    const toggleFavorite = async (item: MenuItem) => {
        if (user?.role !== 'customer') {
            message.warning('请先登录顾客账号后再收藏');
            return;
        }

        try {
            const result = await customerApi.toggleFavorite(item.id);
            setFavorites((previous) => {
                const next = new Set(previous);
                if (result.favorited) {
                    next.add(item.id);
                } else {
                    next.delete(item.id);
                }
                return next;
            });
            message.success(result.favorited ? '已加入收藏' : '已取消收藏');
        } catch (error) {
            message.error(getErrorMessage(error));
        }
    };

    const openReviews = async (item: MenuItem) => {
        setReviewItem(item);
        setReviews([]);
        setReviewsLoading(true);
        try {
            setReviews(await menuApi.reviews(item.id));
        } catch (error) {
            message.error(getErrorMessage(error));
        } finally {
            setReviewsLoading(false);
        }
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
                    <div className="order-subtitle">
                        扫码点餐 · 提交后后厨立即收到
                    </div>
                </div>
                <div className="order-header-actions">
                    <span className="order-header-badge">🍽️ 堂食</span>
                    {(!user || user.role === 'customer') && (
                        <Link
                            className="order-header-link"
                            to={user?.role === 'customer' ? '/customer' : '/login'}
                        >
                            {user?.role === 'customer' ? '个人中心' : '登录 / 注册'}
                        </Link>
                    )}
                </div>
            </header>

            <main className="order-container">
                {!user && (
                    <Alert
                        className="order-login-tip"
                        type="info"
                        showIcon
                        message="登录顾客账号后，可收藏菜品、查看历史订单并发表评价"
                        action={
                            <Link to="/login">
                                <Button size="small">去登录</Button>
                            </Link>
                        }
                    />
                )}

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
                        <span className="order-current-hint">
                            修改数量后再次提交即可覆盖
                        </span>
                    </div>
                )}

                {menu.length === 0 ? (
                    <Empty
                        className="order-empty"
                        description="菜单暂时为空，请稍后再来"
                    />
                ) : (
                    <>
                        <div className="category-filter">
                            {categories.map((category) => (
                                <Button
                                    key={category}
                                    size="small"
                                    shape="round"
                                    type={activeCategory === category ? 'primary' : 'default'}
                                    onClick={() => setActiveCategory(category)}
                                >
                                    {category}
                                </Button>
                            ))}
                        </div>

                        {visibleMenu.length === 0 ? (
                            <Empty description="该分类下暂时没有菜品" />
                        ) : (
                            <div className="card-grid menu-grid">
                                {visibleMenu.map((item) => {
                                    const quantity = cart[item.id] ?? 0;
                                    const favorited = favorites.has(item.id);

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
                                                            🍽️
                                                        </div>
                                                    )}
                                                    <Button
                                                        className="menu-favorite"
                                                        shape="circle"
                                                        size="small"
                                                        aria-label={favorited ? '取消收藏' : '收藏'}
                                                        icon={
                                                            favorited ? (
                                                                <HeartFilled />
                                                            ) : (
                                                                <HeartOutlined />
                                                            )
                                                        }
                                                        onClick={() => void toggleFavorite(item)}
                                                    />
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
                                            <div className="menu-rating-row">
                                                <Rate
                                                    disabled
                                                    allowHalf
                                                    value={item.rating}
                                                    className="menu-rate"
                                                />
                                                <span className="menu-rating-text">
                                                    {item.reviewCount > 0
                                                        ? `${item.rating.toFixed(1)} 分 · ${item.reviewCount} 条评价`
                                                        : '暂无评价'}
                                                </span>
                                                {item.reviewCount > 0 && (
                                                    <Button
                                                        type="link"
                                                        size="small"
                                                        className="menu-review-link"
                                                        onClick={() => void openReviews(item)}
                                                    >
                                                        查看
                                                    </Button>
                                                )}
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
                        )}
                    </>
                )}
            </main>

            <div className="order-bottom-bar">
                <div className="order-total">
                    <span>已选 {totalQuantity} 份</span>
                    <strong>¥{totalAmount.toFixed(2)}</strong>
                </div>

                <div className="order-submit-area">
                    <span className="order-submit-hint">
                        提交后仍可修改并再次提交
                    </span>
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

            <Modal
                open={reviewItem !== null}
                title={reviewItem ? `${reviewItem.name} · 顾客评价` : '顾客评价'}
                footer={null}
                width={520}
                onCancel={() => setReviewItem(null)}
                destroyOnClose
            >
                {reviewsLoading ? (
                    <div className="review-loading">
                        <Spin />
                    </div>
                ) : reviews.length === 0 ? (
                    <Empty description="暂时还没有评价" />
                ) : (
                    <div className="review-list">
                        {reviews.map((review) => (
                            <div className="review-item" key={review.id}>
                                <div className="review-head">
                                    <strong>{review.nickname}</strong>
                                    <Rate disabled value={review.rating} />
                                    <span className="review-date">
                                        {review.createdAt.slice(0, 10)}
                                    </span>
                                </div>
                                <p>{review.content || '该顾客没有填写文字评价'}</p>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>
        </div>
    );
}
