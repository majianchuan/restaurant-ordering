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
import { CheckOutlined, ReloadOutlined, UndoOutlined } from '@ant-design/icons';
import { AppHeader } from '../components/AppHeader';
import { getErrorMessage, orderApi } from '../api/client';
import type { TableOverview } from '../types';
import { getTableStatus } from '../utils/order';

const POLL_INTERVAL = 5000;

export function KitchenPage() {
    const { message } = AntdApp.useApp();
    const [tables, setTables] = useState<TableOverview[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);

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

    const handleToggle = async (itemId: number, done: boolean) => {
        setTogglingId(itemId);
        try {
            await orderApi.toggleItem(itemId, done);
            await load(true);
            message.success(done ? '已标记为做好' : '已撤销完成状态');
        } catch (error) {
            message.error(getErrorMessage(error));
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <div className="app-shell">
            <AppHeader title="后厨" />
            <main className="page-container">
                <div className="page-title-row page-title-row-inline">
                    <div>
                        <h1>后厨看板</h1>
                        <p>点击餐桌卡片查看点餐明细并标记菜品是否做好</p>
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
                    <div className="card-grid kitchen-grid">
                        {tables.map((table) => {
                            const status = getTableStatus(table.order);

                            return (
                                <article
                                    key={table.id}
                                    className={`status-card is-${status.key}`}
                                    onClick={() => openTable(table)}
                                >
                                    <div className="status-card-head">
                                        <span className="status-card-name">{table.name}</span>
                                        <Tag color={status.color}>{status.label}</Tag>
                                    </div>

                                    <div className="status-card-metrics">
                                        <div>
                                            <span className="metric-label">已做</span>
                                            <span className="metric-value done">
                                                {table.order?.doneCount ?? 0}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="metric-label">未做</span>
                                            <span className="metric-value undone">
                                                {table.order?.undoneCount ?? 0}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="status-card-foot">
                                        <span>
                                            {table.order
                                                ? `共 ${table.order.totalQuantity} 份`
                                                : '等待顾客点餐'}
                                        </span>
                                        <span>
                                            {table.order ? `¥${table.order.totalAmount}` : '—'}
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
                                <div className="order-summary-label">已做 / 未做</div>
                                <div className="order-summary-value">
                                    <span className="text-success">
                                        {selected.order.doneCount}
                                    </span>
                                    {' / '}
                                    <span className="text-warning">
                                        {selected.order.undoneCount}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <div className="order-summary-label">合计</div>
                                <div className="order-summary-value">
                                    ¥{selected.order.totalAmount}
                                </div>
                            </div>
                        </div>

                        {selected.order.status === 'paid' && (
                            <Alert
                                type="success"
                                showIcon
                                message="该订单已结账，所有菜品视为已做好"
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
                                            ¥{item.price} / 份 ·{' '}
                                            {item.done ? '已做好' : '待制作'}
                                        </div>
                                    </div>

                                    <div className="order-item-price">
                                        ¥{(Number(item.price) * item.quantity).toFixed(2)}
                                    </div>

                                    {selected.order && selected.order.status !== 'paid' && (
                                        <Button
                                            size="small"                                            type={item.done ? 'default' : 'primary'}
                                            icon={
                                                item.done ? <UndoOutlined /> : <CheckOutlined />
                                            }
                                            loading={togglingId === item.id}
                                            onClick={() =>
                                                void handleToggle(item.id, !item.done)
                                            }
                                        >
                                            {item.done ? '撤销' : '标记做好'}
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="order-footer">
                            <span>共 {selected.order.totalQuantity} 份</span>
                            <strong>¥{selected.order.totalAmount}</strong>
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
}
