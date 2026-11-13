import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    App as AntdApp,
    Button,
    Drawer,
    Empty,
    Spin,
    Tag,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { AppHeader } from '../components/AppHeader';
import { getErrorMessage, orderApi } from '../api/client';
import type { TableOverview } from '../types';
import { getTableStatus } from '../utils/order';

const POLL_INTERVAL = 5000;

export function CashierPage() {
    const { message, modal } = AntdApp.useApp();
    const [tables, setTables] = useState<TableOverview[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [paying, setPaying] = useState(false);

    const load = useCallback(
        async (silent = false) => {
            try {
                setTables(await orderApi.overview());
            } catch (error) {
                if (!silent) {
                    message.error(getErrorMessage(error));
                }
            } finally {
                setLoading(false);
            }
        },
        [message]
    );

    useEffect(() => {
        void load();
        const timer = window.setInterval(() => {
            void load(true);
        }, POLL_INTERVAL);
        return () => window.clearInterval(timer);
    }, [load]);

    const selected = tables.find((table) => table.id === selectedId) ?? null;
    const selectedStatus = selected ? getTableStatus(selected.order) : null;

    const openTable = (table: TableOverview) => {
        setSelectedId(table.id);
        setDrawerOpen(true);
    };

    const confirmPay = (table: TableOverview) => {
        const order = table.order;
        if (!order || order.status === 'paid') {
            return;
        }

        modal.confirm({
            title: `确认结账「${table.name}」？`,
            content: `本次订单共 ${order.totalQuantity} 份，合计 ¥${order.totalAmount}。结账后所有菜品视为已做好。`,
            okText: '确认结账',
            cancelText: '取消',
            okButtonProps: { danger: true },
            onOk: async () => {
                setPaying(true);
                try {
                    await orderApi.pay(order.id);
                    message.success('结账成功');
                    await load(true);
                } catch (error) {
                    message.error(getErrorMessage(error));
                    throw error;
                } finally {
                    setPaying(false);
                }
            },
        });
    };

    return (
        <div className="app-shell">
            <AppHeader title="收银台" />
            <main className="page-container">
                <div className="page-title-row page-title-row-inline">
                    <div>
                        <h1>收银台</h1>
                        <p>点击餐桌卡片查看点餐明细并完成结账</p>
                    </div>
                    <div className="page-title-actions">
                        <span className="polling-hint">每 {POLL_INTERVAL / 1000} 秒自动刷新</span>
                        <Button icon={<ReloadOutlined />} onClick={() => void load()}>
                            刷新
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="page-loading">
                        <Spin size="large" />
                    </div>
                ) : tables.length === 0 ? (
                    <Empty description="店长还没有添加餐桌" />
                ) : (
                    <div className="card-grid cashier-grid">
                        {tables.map((table) => {
                            const status = getTableStatus(table.order);

                            return (
                                <article
                                    key={table.id}
                                    className={`status-card cashier-card is-${status.key}`}
                                    onClick={() => openTable(table)}
                                >
                                    <div className="status-card-head">
                                        <span className="status-card-name">{table.name}</span>
                                        <Tag color={status.color}>{status.label}</Tag>
                                    </div>

                                    <div className="cashier-amount">
                                        ¥{table.order ? table.order.totalAmount : '0.00'}
                                    </div>

                                    <div className="status-card-foot">
                                        <span>
                                            {table.order
                                                ? `共 ${table.order.totalQuantity} 份菜品`
                                                : '等待顾客点餐'}
                                        </span>
                                        <span>
                                            {!table.order
                                                ? '—'
                                                : table.order.status === 'paid'
                                                  ? '已结账'
                                                  : '待结账'}
                                        </span>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </main>

            <Drawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                width={520}
                title={
                    selected ? (
                        <span className="drawer-title">
                            {selected.name}
                            {selectedStatus && (
                                <Tag color={selectedStatus.color}>{selectedStatus.label}</Tag>
                            )}
                        </span>
                    ) : (
                        '点餐明细'
                    )
                }
            >
                {!selected ? null : !selected.order ? (
                    <Empty description="该餐桌暂无点餐" />
                ) : (
                    <div>
                        <div className="order-summary">
                            <div>
                                <div className="order-summary-label">订单号</div>
                                <div className="order-summary-value">
                                    #{selected.order.id}
                                </div>
                            </div>
                            <div>
                                <div className="order-summary-label">菜品数量</div>
                                <div className="order-summary-value">
                                    {selected.order.totalQuantity} 份
                                </div>
                            </div>
                            <div>
                                <div className="order-summary-label">合计</div>
                                <div className="order-summary-value amount">
                                    ¥{selected.order.totalAmount}
                                </div>
                            </div>
                        </div>

                        {selected.order.status === 'paid' ? (
                            <Alert
                                type="success"
                                showIcon
                                message={`已于 ${
                                    selected.order.paidAt
                                        ? dayjs(selected.order.paidAt).format('YYYY-MM-DD HH:mm')
                                        : ''
                                } 结账`}
                                style={{ marginBottom: 16 }}
                            />
                        ) : (
                            <Alert
                                type="warning"
                                showIcon
                                message="结账后所有菜品将视为已做好，未做的菜品也会被记为完成"
                                style={{ marginBottom: 16 }}
                            />
                        )}

                        <div className="order-items">
                            {selected.order.items.map((item) => (
                                <div
                                    key={item.id}
                                    className={`order-item${item.done ? ' is-done' : ''}`}
                                >
                                    <div className="order-item-main">
                                        <div className="order-item-name">
                                            {item.name}
                                            <span className="order-item-qty">
                                                × {item.quantity}
                                            </span>
                                        </div>
                                        <div className="order-item-meta">
                                            ¥{item.price} / 份
                                        </div>
                                    </div>

                                    <div className="order-item-price">
                                        ¥{(Number(item.price) * item.quantity).toFixed(2)}
                                    </div>

                                    <Tag color={item.done ? 'green' : 'orange'}>
                                        {item.done ? '已做好' : '未做'}
                                    </Tag>
                                </div>
                            ))}
                        </div>

                        <div className="order-pay-bar">
                            <div className="order-pay-total">
                                <span>合计</span>
                                <strong>¥{selected.order.totalAmount}</strong>
                            </div>

                            {selected.order.status === 'pending' ? (
                                <Button
                                    type="primary"
                                    danger
                                    size="large"
                                    loading={paying}
                                    onClick={() => confirmPay(selected)}
                                >
                                    结账
                                </Button>
                            ) : (
                                <Tag color="default" className="paid-tag">
                                    已结账
                                </Tag>
                            )}
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
}
