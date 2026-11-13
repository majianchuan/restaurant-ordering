import { useCallback, useEffect, useState } from 'react';
import {
    App as AntdApp,
    Button,
    Card,
    Empty,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Space,
    Spin,
    Tag,
    Upload,
    type UploadProps,
} from 'antd';
import {
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    ReloadOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import { assetUrl } from '../../constants';
import { getErrorMessage, menuApi, uploadApi } from '../../api/client';
import type { MenuItem, MenuItemPayload } from '../../types';

interface MenuFormValues {
    name: string;
    price: number;
    description?: string;
    imageUrl?: string;
}

export function MenuTab() {
    const { message } = AntdApp.useApp();
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<MenuItem | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm<MenuFormValues>();
    const imageUrl = Form.useWatch('imageUrl', form) ?? '';

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setItems(await menuApi.list());
        } catch (error) {
            message.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [message]);

    useEffect(() => {
        void load();
    }, [load]);

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({ name: '', description: '', imageUrl: '' });
        setModalOpen(true);
    };

    const openEdit = (item: MenuItem) => {
        setEditing(item);
        form.setFieldsValue({
            name: item.name,
            price: Number(item.price),
            description: item.description,
            imageUrl: item.imageUrl,
        });
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        let values: MenuFormValues;
        try {
            values = await form.validateFields();
        } catch {
            return;
        }

        const payload: MenuItemPayload = {
            name: values.name.trim(),
            price: Number(values.price),
            description: values.description?.trim() ?? '',
            imageUrl: values.imageUrl?.trim() ?? '',
        };

        setSubmitting(true);
        try {
            if (editing) {
                await menuApi.update(editing.id, payload);
                message.success('菜品已更新');
            } else {
                await menuApi.create(payload);
                message.success('菜品已添加');
            }
            setModalOpen(false);
            await load();
        } catch (error) {
            message.error(getErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemove = async (item: MenuItem) => {
        try {
            await menuApi.remove(item.id);
            message.success('菜品已删除');
            await load();
        } catch (error) {
            message.error(getErrorMessage(error));
        }
    };

    const uploadProps: UploadProps = {
        accept: 'image/*',
        showUploadList: false,
        customRequest: async ({ file, onSuccess, onError }) => {
            try {
                const result = await uploadApi.image(file as File);
                form.setFieldValue('imageUrl', result.url);
                onSuccess?.(result);
                message.success('图片上传成功');
            } catch (error) {
                onError?.(error as Error);
                message.error(getErrorMessage(error));
            }
        },
    };

    return (
        <div>
            <div className="panel-toolbar">
                <div>
                    <h2>菜单管理</h2>
                    <span className="toolbar-subtitle">
                        共 {items.length} 道在售菜品
                    </span>
                </div>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => void load()}>
                        刷新
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        添加菜品
                    </Button>
                </Space>
            </div>

            {loading ? (
                <div className="tab-loading">
                    <Spin />
                </div>
            ) : items.length === 0 ? (
                <Empty description="还没有菜品，点击右上角添加" />
            ) : (
                <div className="card-grid menu-manage-grid">
                    {items.map((item) => (
                        <Card
                            key={item.id}
                            className="menu-manage-card"
                            cover={
                                <div className="menu-cover">
                                    {item.imageUrl ? (
                                        <img
                                            src={assetUrl(item.imageUrl)}
                                            alt={item.name}
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="menu-cover-placeholder">🍽️</div>
                                    )}
                                </div>
                            }
                            actions={[
                                <Button
                                    key="edit"
                                    type="text"
                                    icon={<EditOutlined />}
                                    onClick={() => openEdit(item)}
                                >
                                    编辑
                                </Button>,
                                <Popconfirm
                                    key="delete"
                                    title={`删除「${item.name}」？`}
                                    description="删除后顾客将看不到该菜品。"
                                    okText="删除"
                                    cancelText="取消"
                                    okButtonProps={{ danger: true }}
                                    onConfirm={() => handleRemove(item)}
                                >
                                    <Button type="text" danger icon={<DeleteOutlined />}>
                                        删除
                                    </Button>
                                </Popconfirm>,
                            ]}
                        >
                            <div className="menu-item-title-row">
                                <h3>{item.name}</h3>
                                <span className="menu-price">¥{item.price}</span>
                            </div>
                            <p className="menu-desc">
                                {item.description || '暂无描述'}
                            </p>
                        </Card>
                    ))}
                </div>
            )}

            <Modal
                title={editing ? '编辑菜品' : '添加菜品'}
                open={modalOpen}
                onOk={handleSubmit}
                onCancel={() => setModalOpen(false)}
                confirmLoading={submitting}
                okText="保存"
                cancelText="取消"
                width={520}
                destroyOnClose
                maskClosable={false}
            >
                <Form form={form} layout="vertical" requiredMark={false} preserve={false}>
                    <Form.Item
                        label="菜品名称"
                        name="name"
                        rules={[
                            { required: true, message: '请输入菜品名称' },
                            { max: 100, message: '菜品名称不能超过 100 个字符' },
                        ]}
                    >
                        <Input placeholder="例如：宫保鸡丁" />
                    </Form.Item>

                    <Form.Item
                        label="价格（元）"
                        name="price"
                        rules={[{ required: true, message: '请输入价格' }]}
                    >
                        <InputNumber
                            min={0.01}
                            max={999999.99}
                            precision={2}
                            prefix="¥"
                            style={{ width: '100%' }}
                            placeholder="0.00"
                        />
                    </Form.Item>

                    <Form.Item label="描述" name="description">
                        <Input.TextArea
                            rows={3}
                            maxLength={500}
                            showCount
                            placeholder="简单介绍这道菜"
                        />
                    </Form.Item>

                    <Form.Item label="菜品图片">
                        <div className="menu-image-field">
                            <div className="menu-image-preview">
                                {imageUrl ? (
                                    <img src={assetUrl(imageUrl)} alt="菜品图片预览" />
                                ) : (
                                    <span>暂无图片</span>
                                )}
                            </div>
                            <Space>
                                <Upload {...uploadProps}>
                                    <Button icon={<UploadOutlined />}>上传图片</Button>
                                </Upload>
                                <Button
                                    onClick={() => form.setFieldValue('imageUrl', '')}
                                    disabled={!imageUrl}
                                >
                                    清除
                                </Button>
                            </Space>
                        </div>
                    </Form.Item>

                    <Form.Item
                        label="图片地址"
                        name="imageUrl"
                        validateTrigger="onBlur"
                        rules={[
                            {
                                validator: async (_, value: string | undefined) => {
                                    if (
                                        !value ||
                                        /^https?:\/\//i.test(value) ||
                                        value.startsWith('/api/uploads/')
                                    ) {
                                        return;
                                    }
                                    throw new Error(
                                        '图片地址必须是 http(s) 链接或已上传的图片'
                                    );
                                },
                            },
                        ]}
                    >
                        <Input placeholder="上传后自动填充，也可直接填写图片链接" />
                    </Form.Item>

                    <Tag color="orange">提示：建议上传 JPG / PNG / WEBP 图片，不超过 5MB</Tag>
                </Form>
            </Modal>
        </div>
    );
}
