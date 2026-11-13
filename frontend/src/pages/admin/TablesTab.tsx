import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    App as AntdApp,
    Button,
    Card,
    Empty,
    Form,
    Input,
    Modal,
    Popconfirm,
    Space,
    Spin,
    Tag,
    Typography,
} from 'antd';
import {
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    QrcodeOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import QRCode from 'qrcode';
import { getErrorMessage, tableApi } from '../../api/client';
import type { DiningTable } from '../../types';

function orderUrl(publicCode: string): string {
    return `${window.location.origin}/order/${publicCode}`;
}

export function TablesTab() {
    const { message } = AntdApp.useApp();
    const [tables, setTables] = useState<DiningTable[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    const [renameTarget, setRenameTarget] = useState<DiningTable | null>(null);
    const [renaming, setRenaming] = useState(false);
    const [renameForm] = Form.useForm<{ name: string }>();

    const [qrTarget, setQrTarget] = useState<DiningTable | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [qrLoading, setQrLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setTables(await tableApi.list());
        } catch (error) {
            message.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [message]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleAdd = async () => {
        setAdding(true);
        try {
            const table = await tableApi.create();
            message.success(`已添加「${table.name}」`);
            await load();
        } catch (error) {
            message.error(getErrorMessage(error));
        } finally {
            setAdding(false);
        }
    };

    const openRename = (table: DiningTable) => {
        setRenameTarget(table);
        renameForm.setFieldsValue({ name: table.name });
    };

    const handleRename = async () => {
        if (!renameTarget) {
            return;
        }

        let values: { name: string };
        try {
            values = await renameForm.validateFields();
        } catch {
            return;
        }

        setRenaming(true);
        try {
            await tableApi.rename(renameTarget.id, values.name.trim());
            message.success('餐桌名称已修改');
            setRenameTarget(null);
            await load();
        } catch (error) {
            message.error(getErrorMessage(error));
        } finally {
            setRenaming(false);
        }
    };

    const handleRemove = async (table: DiningTable) => {
        try {
            await tableApi.remove(table.id);
            message.success(`已删除「${table.name}」`);
            await load();
        } catch (error) {
            message.error(getErrorMessage(error));
        }
    };

    const openQr = async (table: DiningTable) => {
        setQrTarget(table);
        setQrDataUrl('');
        setQrLoading(true);

        try {
            const dataUrl = await QRCode.toDataURL(orderUrl(table.publicCode), {
                width: 320,
                margin: 1,
                color: { dark: '#1f1f1f', light: '#ffffff' },
            });
            setQrDataUrl(dataUrl);
        } catch (error) {
            message.error(getErrorMessage(error, '二维码生成失败'));
        } finally {
            setQrLoading(false);
        }
    };

    const closeQr = () => {
        setQrTarget(null);
        setQrDataUrl('');
    };

    return (
        <div>
            <div className="panel-toolbar">
                <div>
                    <h2>餐桌管理</h2>
                    <span className="toolbar-subtitle">
                        共 {tables.length} 张餐桌，新增餐桌自动按序号命名
                    </span>
                </div>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => void load()}>
                        刷新
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        loading={adding}
                        onClick={handleAdd}
                    >
                        添加餐桌
                    </Button>
                </Space>
            </div>

            {loading ? (
                <div className="tab-loading">
                    <Spin />
                </div>
            ) : tables.length === 0 ? (
                <Empty description="还没有餐桌，点击右上角添加" />
            ) : (
                <div className="card-grid table-grid">
                    {tables.map((table) => (
                        <Card
                            key={table.id}
                            className="table-card"
                            title={<span className="table-name">{table.name}</span>}
                            extra={<Tag color="orange">点餐二维码</Tag>}
                            actions={[
                                <Button
                                    key="rename"
                                    type="text"
                                    icon={<EditOutlined />}
                                    onClick={() => openRename(table)}
                                >
                                    改名
                                </Button>,
                                <Button
                                    key="qr"
                                    type="text"
                                    icon={<QrcodeOutlined />}
                                    onClick={() => void openQr(table)}
                                >
                                    二维码
                                </Button>,
                                <Popconfirm
                                    key="delete"
                                    title={`删除「${table.name}」？`}
                                    description="该餐桌的历史订单会一并删除，且二维码将失效。"
                                    okText="删除"
                                    cancelText="取消"
                                    okButtonProps={{ danger: true }}
                                    onConfirm={() => handleRemove(table)}
                                >
                                    <Button type="text" danger icon={<DeleteOutlined />}>
                                        删除
                                    </Button>
                                </Popconfirm>,
                            ]}
                        >
                            <div className="table-code">
                                编码：{table.publicCode.slice(0, 12)}…
                            </div>
                            <div className="table-url">{orderUrl(table.publicCode)}</div>
                        </Card>
                    ))}
                </div>
            )}

            <Modal
                title="修改餐桌名称"
                open={renameTarget !== null}
                onOk={handleRename}
                onCancel={() => setRenameTarget(null)}
                confirmLoading={renaming}
                okText="保存"
                cancelText="取消"
                destroyOnClose
                maskClosable={false}
            >
                <Form form={renameForm} layout="vertical" requiredMark={false} preserve={false}>
                    <Form.Item
                        label="餐桌名称"
                        name="name"
                        rules={[
                            { required: true, message: '请输入餐桌名称' },
                            { max: 30, message: '餐桌名称不能超过 30 个字符' },
                        ]}
                    >
                        <Input placeholder="例如：大厅 1 号桌" maxLength={30} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={qrTarget ? `${qrTarget.name} · 点餐二维码` : '点餐二维码'}
                open={qrTarget !== null}
                onCancel={closeQr}
                width={400}
                footer={<Button onClick={closeQr}>关闭</Button>}
                destroyOnClose
            >
                <div className="qr-box">
                    {qrLoading ? (
                        <Spin />
                    ) : qrDataUrl ? (
                        <img className="qr-image" src={qrDataUrl} alt="点餐二维码" />
                    ) : (
                        <Empty description="二维码生成失败" />
                    )}

                    <Typography.Title level={4} className="qr-table-name">
                        {qrTarget?.name}
                    </Typography.Title>

                    {qrTarget && (
                        <Typography.Text
                            className="qr-url"
                            copyable={{ text: orderUrl(qrTarget.publicCode) }}
                        >
                            {orderUrl(qrTarget.publicCode)}
                        </Typography.Text>
                    )}

                    <Alert
                        type="info"
                        showIcon
                        message="二维码基于餐桌的固定编码生成，修改餐桌名称不会使其失效。"
                    />
                </div>
            </Modal>
        </div>
    );
}
