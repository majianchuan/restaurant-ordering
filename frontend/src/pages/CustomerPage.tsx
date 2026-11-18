import { useEffect, useState } from 'react';
import {
    App as AntdApp,
    Button,
    Card,
    Empty,
    Form,
    Input,
    Modal,
    Rate,
    Space,
    Spin,
    Tabs,
    Tag,
} from 'antd';
import { HeartFilled, HeartOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons';
import { AppHeader } from '../components/AppHeader';
import { assetUrl } from '../constants';
import { useAuth } from '../auth/AuthContext';
import {
    authApi,
    customerApi,
    getErrorMessage,
} from '../api/client';
import type { MenuItem, Order, OrderItem, Review } from '../types';

function formatTime(value: string | null): string {
    return value ? value.slice(0, 16) : '-';
}

function statusTag(status: Order['status']) {
    if (status === 'paid') {
        return <Tag>已结账</Tag>;
    }
    if (status === 'served') {
        return <Tag color="green">已上齐</Tag>;
    }
    return <Tag color="orange">制作中</Tag>;
}

interface ReviewTarget {
    orderId: number;
    item: OrderItem;
}

export function CustomerPage() {
    const { user, updateUser } = useAuth();
    const { message } = AntdApp.useApp();
    const [orders, setOrders] = useState<Order[]>([]);
    const [favorites, setFavorites] = useState<MenuItem[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewForm] = Form.useForm<{ rating: number; content: string }>();
    const [profileForm] = Form.useForm<{ nickname: string; phone: string }>();
    const [profileSaving, setProfileSaving] = useState(false);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [orderData, favoriteData, reviewData] = await Promise.all([
                customerApi.myOrders(),
                customerApi.favorites(),
                customerApi.myReviews(),
            ]);
            setOrders(orderData);
            setFavorites(favoriteData);
            setReviews(reviewData);
        } catch (error) {
            message.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (user) {
            profileForm.setFieldsValue({
                nickname: user.nickname,
                phone: user.phone ?? '',
            });
        }
    }, [user, profileForm]);

    const removeFavorite = async (item: MenuItem) => {
        try {
            await customerApi.toggleFavorite(item.id);
            setFavorites((previous) => previous.filter((favorite) => favorite.id !== item.id));
            message.success('已取消收藏');
        } catch (error) {
            message.error(getErrorMessage(error));
        }
    };

    const openReview = (orderId: number, item: OrderItem) => {
        setReviewTarget({ orderId, item });
        reviewForm.setFieldsValue({ rating: 5, content: '' });
    };

    const submitReview = async () => {
        if (!reviewTarget) {
            return;
        }

        let values: { rating: number; content: string };
        try {
            values = await reviewForm.validateFields();
        } catch {
            return;
        }

        setReviewSubmitting(true);
        try {
            await customerApi.createReview(reviewTarget.orderId, {
                menuItemId: reviewTarget.item.menuItemId,
                rating: values.rating,
                content: values.content?.trim() ?? '',
            });
            message.success('评价已提交');
            setReviewTarget(null);
            await loadAll();
        } catch (error) {
            message.error(getErrorMessage(error));
        } finally {
            setReviewSubmitting(false);
        }
    };

    const saveProfile = async (values: { nickname: string; phone: string }) => {
        setProfileSaving(true);
        try {
            const updated = await authApi.updateProfile({
                nickname: values.nickname.trim(),
                phone: values.phone?.trim() ?? '',
            });
            updateUser(updated);
            message.success('个人资料已保存');
        } catch (error) {
            message.error(getErrorMessage(error));
        } finally {
            setProfileSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="app-shell">
                <AppHeader title="个人中心" />
                <div className="page-loading">
                    <Spin size="large" />
                </div>
            </div>
        );
    }

    const ordersTab = (
        <div className="customer-orders">
            {orders.length === 0 ? (
                <Empty description="还没有下过单，扫描餐桌二维码开始点餐吧" />
            ) : (
                orders.map((order) => (
                    <Card key={order.id} className="customer-order-card">
                        <div className="customer-order-head">
                            <div>
                                <strong>订单 #{order.id}</strong>
                                <span className="customer-order-table">
                                    {order.tableName ?? `${order.tableId} 号桌`}
                                </span>
                            </div>
                            <Space>
                                {statusTag(order.status)}
                                <span className="customer-order-time">
                                    {formatTime(order.createdAt)}
                                </span>
                            </Space>
                        </div>

                        <div className="customer-order-items">
                            {order.items.map((item) => (
                                <div className="customer-order-item" key={item.id}>
                                    <span>
                                        {item.name} × {item.quantity}
                                    </span>
                                    <Space>
                                        {item.review ? (
                                            <span className="customer-reviewed">
                                                <Rate disabled value={item.review.rating} /> 已评价
                                            </span>
                                        ) : order.status === 'paid' ? (
                                            <Button
                                                type="link"
                                                size="small"
                                                onClick={() => openReview(order.id, item)}
                                            >
                                                评价
                                            </Button>
                                        ) : null}
                                        <span className="customer-item-price">
                                            ¥
                                            {(
                                                Number(item.price) * item.quantity
                                            ).toFixed(2)}
                                        </span>
                                    </Space>
                                </div>
                            ))}
                        </div>

                        <div className="customer-order-foot">
                            <span>共 {order.totalQuantity} 份</span>
                            <strong>¥{order.totalAmount}</strong>
                            <span>{order.paidAt ? `结账 ${formatTime(order.paidAt)}` : ''}</span>
                        </div>
                    </Card>
                ))
            )}
        </div>
    );

    const favoritesTab = (
        <div className="card-grid menu-grid">
            {favorites.length === 0 ? (
                <Empty description="还没有收藏菜品，点餐时点击心形按钮即可收藏" />
            ) : (
                favorites.map((item) => (
                    <Card
                        key={item.id}
                        className="menu-item-card"
                        cover={
                            <div className="menu-cover">
                                {item.imageUrl ? (
                                    <img src={assetUrl(item.imageUrl)} alt={item.name} />
                                ) : (
                                    <div className="menu-cover-placeholder">🍽️</div>
                                )}
                                <Button
                                    className="menu-favorite is-favorite"
                                    shape="circle"
                                    size="small"
                                    aria-label="取消收藏"
                                    icon={<HeartFilled />}
                                    onClick={() => void removeFavorite(item)}
                                />
                            </div>
                        }
                    >
                        <div className="menu-item-title-row">
                            <h3>{item.name}</h3>
                            <span className="menu-price">¥{item.price}</span>
                        </div>
                        <div className="menu-rating-row">
                            <Rate disabled allowHalf value={item.rating} />
                            <span className="menu-rating-text">
                                {item.reviewCount > 0
                                    ? `${item.rating.toFixed(1)} 分 · ${item.reviewCount} 条评价`
                                    : '暂无评价'}
                            </span>
                        </div>
                        <p className="menu-desc">{item.description || '暂无描述'}</p>
                        <Button
                            type="text"
                            danger
                            size="small"
                            icon={<HeartOutlined />}
                            onClick={() => void removeFavorite(item)}
                        >
                            取消收藏
                        </Button>
                    </Card>
                ))
            )}
        </div>
    );

    const reviewsTab = (
        <div className="customer-reviews">
            {reviews.length === 0 ? (
                <Empty description="还没有发表评价，结账后可以对菜品进行评价" />
            ) : (
                reviews.map((review) => (
                    <Card key={review.id} className="customer-review-card">
                        <div className="customer-order-head">
                            <strong>{review.menuName}</strong>
                            <Rate disabled value={review.rating} />
                        </div>
                        <p>{review.content || '该顾客没有填写文字评价'}</p>
                        <span className="customer-order-time">
                            订单 #{review.orderId} · {formatTime(review.createdAt)}
                        </span>
                    </Card>
                ))
            )}
        </div>
    );

    const profileTab = (
        <Card className="customer-profile-card">
            <Form
                form={profileForm}
                layout="vertical"
                onFinish={saveProfile}
                requiredMark={false}
                style={{ maxWidth: 460 }}
            >
                <Form.Item label="用户名">
                    <Input value={user?.username} disabled prefix={<UserOutlined />} />
                </Form.Item>
                <Form.Item
                    label="昵称"
                    name="nickname"
                    rules={[
                        { required: true, message: '请输入昵称' },
                        { max: 30, message: '昵称不能超过 30 个字符' },
                    ]}
                >
                    <Input prefix={<UserOutlined />} placeholder="用于页面显示" />
                </Form.Item>
                <Form.Item
                    label="手机号"
                    name="phone"
                    rules={[{ pattern: /^[0-9+\-\s]{5,20}$/, message: '手机号格式不正确' }]}
                >
                    <Input prefix={<PhoneOutlined />} placeholder="选填" />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={profileSaving}>
                    保存资料
                </Button>
            </Form>
        </Card>
    );

    return (
        <div className="app-shell">
            <AppHeader title="个人中心" />
            <main className="page-container">
                <div className="page-title-row page-title-row-inline">
                    <div>
                        <h1>个人中心</h1>
                        <p>查看订单、收藏和评价，管理个人资料</p>
                    </div>
                    <Tag color="orange">顾客</Tag>
                </div>

                <Tabs
                    className="admin-tabs customer-tabs"
                    defaultActiveKey="orders"
                    items={[
                        {
                            key: 'orders',
                            label: <span>我的订单</span>,
                            children: ordersTab,
                        },
                        {
                            key: 'favorites',
                            label: <span>我的收藏</span>,
                            children: favoritesTab,
                        },
                        {
                            key: 'reviews',
                            label: <span>我的评价</span>,
                            children: reviewsTab,
                        },
                        {
                            key: 'profile',
                            label: <span>个人资料</span>,
                            children: profileTab,
                        },
                    ]}
                />
            </main>

            <Modal
                title={reviewTarget ? `评价「${reviewTarget.item.name}」` : '发表评价'}
                open={reviewTarget !== null}
                onOk={() => void submitReview()}
                onCancel={() => setReviewTarget(null)}
                confirmLoading={reviewSubmitting}
                okText="提交评价"
                cancelText="取消"
                destroyOnClose
            >
                <Form form={reviewForm} layout="vertical" requiredMark={false}>
                    <Form.Item
                        label="评分"
                        name="rating"
                        rules={[{ required: true, message: '请选择评分' }]}
                    >
                        <Rate allowClear={false} />
                    </Form.Item>
                    <Form.Item
                        label="评价内容"
                        name="content"
                        rules={[{ max: 500, message: '评价不能超过 500 个字符' }]}
                    >
                        <Input.TextArea
                            rows={4}
                            maxLength={500}
                            showCount
                            placeholder="说说这道菜的味道、分量或出餐速度"
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
