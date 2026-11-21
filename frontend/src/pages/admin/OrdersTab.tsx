import { useCallback, useEffect, useState } from 'react';
import {
    App as AntdApp,
    Button,
    Descriptions,
    Drawer,
    Empty,
    Input,
    Select,
    Space,
    Spin,
    Table,
    Tag,
} from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { adminApi, getErrorMessage } from '../../api/client';
import type { AdminOrderSummary, Order, OrderStatus } from '../../types';

const STATUS_LABELS: Record<OrderStatus, { text: string; color: string }> = {
    pending: { text: '未结账', color: 'orange' },
    paid: { text: '已结账', color: 'default' },
};

export function OrdersTab() {
    const { message } = AntdApp.useApp();
    const [items, setItems] = useState<AdminOrderSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const [total, setTotal] = useState(0);
    const [detail, setDetail] = useState<Order | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminApi.orders({ keyword, status, page, pageSize });
            setItems(data.items);
            setTotal(data.total);
            setPage(data.page);
            setPageSize(data.pageSize);
        } catch (error) {
            message.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [keyword, message, page, pageSize, status]);

    useEffect(() => {
        void load();
    }, [load]);

    const openDetail = async (id: number) => {
        setDrawerOpen(true);
        setDetail(null);
        setDetailLoading(true);
        try {
            setDetail(await adminApi.orderDetail(id));
        } catch (error) {
            message.error(getErrorMessage(error));
        } finally {
            setDetailLoading(false);
        }
    };

    const columns: ColumnsType<AdminOrderSummary> = [
        {
            title: '订单号',
            dataIndex: 'id',
            key: 'id',
            width: 90,
            render: (id: number) => `#${id}`,
        },
        {
            title: '桌台',
            dataIndex: 'tableName',
            key: 'tableName',
            width: 110,
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (value: OrderStatus) => (
                <Tag color={STATUS_LABELS[value].color}>{STATUS_LABELS[value].text}</Tag>
            ),
        },
        {
            title: '份数',
            dataIndex: 'totalQuantity',
            key: 'totalQuantity',
            width: 80,
            align: 'center',
        },
        {
            title: '金额',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            width: 100,
            align: 'right',
            render: (value: string) => <b>¥{value}</b>,
        },
        {
            title: '下单时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 150,
            render: (value: string) => dayjs(value).format('MM-DD HH:mm'),
        },
        {
            title: '操作',
            key: 'actions',
            width: 80,
            render: (_, record) => (
                <Button type="link" size="small" onClick={() => void openDetail(record.id)}>
                    查看
                </Button>
            ),
        },
    ];

    return (
        <div>
            <div className="panel-toolbar">
                <div>
                    <h2>订单管理</h2>
                    <span className="toolbar-subtitle">共 {total} 条订单</span>
                </div>
                <Space>
                    <Input.Search
                        allowClear
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        onSearch={(value) => {
                            setKeyword(value);
                            setPage(1);
                        }}
                        placeholder="订单号 / 桌名"
                        prefix={<SearchOutlined />}
                        style={{ width: 220 }}
                    />
                    <Select
                        value={status}
                        style={{ width: 120 }}
                        onChange={(value) => {
                            setStatus(value);
                            setPage(1);
                        }}
                        options={[
                            { value: '', label: '全部状态' },
                            { value: 'pending', label: '未结账' },
                            { value: 'paid', label: '已结账' },
                        ]}
                    />
                    <Button icon={<ReloadOutlined />} onClick={() => void load()}>
                        刷新
                    </Button>
                </Space>
            </div>

            <Table<AdminOrderSummary>
                rowKey="id"
                size="middle"
                loading={loading}
                columns={columns}
                dataSource={items}
                scroll={{ x: 1000 }}
                pagination={{
                    current: page,
                    pageSize,
                    total,
                    showSizeChanger: false,
                    onChange: (nextPage) => setPage(nextPage),
                }}
            />

            <Drawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                width={520}
                title={detail ? `订单 #${detail.id}` : '订单详情'}
            >
                {detailLoading || !detail ? (
                    <div className="tab-loading">
                        <Spin />
                    </div>
                ) : (
                    <div>
                        <Descriptions column={2} size="small" bordered>
                            <Descriptions.Item label="桌台">
                                {detail.tableName ?? detail.tableId}
                            </Descriptions.Item>
                            <Descriptions.Item label="状态">
                                <Tag color={STATUS_LABELS[detail.status].color}>
                                    {STATUS_LABELS[detail.status].text}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="份数">
                                {detail.totalQuantity}
                            </Descriptions.Item>
                            <Descriptions.Item label="下单时间">
                                {dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm')}
                            </Descriptions.Item>
                            <Descriptions.Item label="结账时间">
                                {detail.paidAt
                                    ? dayjs(detail.paidAt).format('YYYY-MM-DD HH:mm')
                                    : '-'}
                            </Descriptions.Item>
                        </Descriptions>

                        <div className="admin-order-items">
                            {detail.items.map((item) => (
                                <div className="admin-order-item" key={item.id}>
                                    <span>
                                        {item.name} × {item.quantity}
                                    </span>
                                    <span>¥{item.price}</span>
                                    <Tag color={item.done ? 'green' : 'orange'}>
                                        {item.done ? '已做好' : '未做'}
                                    </Tag>
                                </div>
                            ))}
                        </div>

                        <div className="admin-order-total">
                            <span>合计</span>
                            <strong>¥{detail.totalAmount}</strong>
                        </div>

                        {detail.items.length === 0 && <Empty description="暂无菜品" />}
                    </div>
                )}
            </Drawer>
        </div>
    );
}
