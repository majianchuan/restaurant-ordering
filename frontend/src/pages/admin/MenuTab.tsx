import { useCallback, useEffect, useMemo, useState } from 'react';
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
    Select,
    Space,
    Spin,
    Tag,
    Upload,
    type UploadProps,
} from 'antd';
import {
    DeleteOutlined,
    EditOutlined,
    PictureOutlined,
    PlusOutlined,
    ReloadOutlined,
    TagsOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import { assetUrl } from '../../constants';
import { getErrorMessage, menuApi, uploadApi } from '../../api/client';
import type { MenuCategory, MenuItem, MenuItemPayload } from '../../types';

interface MenuFormValues {
    name: string;
    categoryId: number;
    price: number;
    description?: string;
    imageUrl?: string;
}

export function MenuTab() {
    const { message } = AntdApp.useApp();
    const [items, setItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<MenuItem | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [filterCategory, setFilterCategory] = useState<number | 'all'>('all');
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [categoryName, setCategoryName] = useState('');
    const [categorySubmitting, setCategorySubmitting] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState('');
    const [form] = Form.useForm<MenuFormValues>();
    const imageUrl = Form.useWatch('imageUrl', form) ?? '';

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [nextItems, nextCategories] = await Promise.all([
                menuApi.list(),
                menuApi.categories(),
            ]);
            setItems(nextItems);
            setCategories(nextCategories);
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
        if (categories.length === 0) {
            message.warning('请先在“管理分类”中添加一个菜品分类');
            return;
        }

        setEditing(null);
        form.resetFields();
        form.setFieldsValue({
            name: '',
            categoryId: categories[0].id,
            description: '',
            imageUrl: '',
        });
        setModalOpen(true);
    };

    const openEdit = (item: MenuItem) => {
        setEditing(item);
        form.setFieldsValue({
            name: item.name,
            categoryId: item.categoryId,
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
            categoryId: values.categoryId,
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
            message.success('菜品及其图片已删除');
            await load();
        } catch (error) {
            message.error(getErrorMessage(error));
        }
    };

    const uploadProps: UploadProps = {
        accept: 'image/jpeg,image/png,image/gif,image/webp',
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

    const visibleItems = useMemo(
        () =>
            filterCategory === 'all'
                ? items
                : items.filter((item) => item.categoryId === filterCategory),
        [filterCategory, items]
    );

    const addCategory = async () => {
        const name = categoryName.trim();
        if (!name) {
            message.warning('请输入分类名称');
            return;
        }

        setCategorySubmitting(true);
        try {
            await menuApi.createCategory(name);
            setCategoryName('');
            message.success('分类已添加');
            await load();
        } catch (error) {
            message.error(getErrorMessage(error));
        } finally {
            setCategorySubmitting(false);
        }
    };

    const saveCategory = async (category: MenuCategory) => {
        const name = editingCategoryName.trim();
        if (!name) {
            message.warning('请输入分类名称');
            return;
        }

        setCategorySubmitting(true);
        try {
            await menuApi.updateCategory(category.id, name);
            setEditingCategoryId(null);
            setEditingCategoryName('');
            message.success('分类已重命名');
            await load();
        } catch (error) {
            message.error(getErrorMessage(error));
        } finally {
            setCategorySubmitting(false);
        }
    };

    const removeCategory = async (category: MenuCategory) => {
        try {
            await menuApi.removeCategory(category.id);
            if (filterCategory === category.id) {
                setFilterCategory('all');
            }
            message.success('分类已删除');
            await load();
        } catch (error) {
            message.error(getErrorMessage(error));
        }
    };

    return (
        <div>
            <div className="panel-toolbar">
                <div>
                    <h2>菜单管理</h2>
                    <span className="toolbar-subtitle">共 {items.length} 道在售菜品</span>
                </div>
                <Space>
                    <Select
                        value={filterCategory}
                        style={{ width: 130 }}
                        onChange={setFilterCategory}
                        options={[
                            { value: 'all', label: '全部分类' },
                            ...categories.map((category) => ({
                                value: category.id,
                                label: category.name,
                            })),
                        ]}
                    />
                    <Button icon={<ReloadOutlined />} onClick={() => void load()}>
                        刷新
                    </Button>
                    <Button icon={<TagsOutlined />} onClick={() => setCategoryModalOpen(true)}>
                        管理分类
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
            ) : visibleItems.length === 0 ? (
                <Empty description="该分类下还没有菜品" />
            ) : (
                <div className="card-grid menu-manage-grid">
                    {visibleItems.map((item) => (
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
                                        <div className="menu-cover-placeholder">
                                            <PictureOutlined />
                                        </div>
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
                                    description="删除后顾客将看不到该菜品，同时会删除其图片。"
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
                            <Space size={8} wrap>
                                <Tag color="orange">{item.category}</Tag>
                            </Space>
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
                        label="菜品分类"
                        name="categoryId"
                        rules={[{ required: true, message: '请选择菜品分类' }]}
                    >
                        <Select
                            options={categories.map((category) => ({
                                value: category.id,
                                label: category.name,
                            }))}
                        />
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

                    <Form.Item name="imageUrl" hidden>
                        <Input />
                    </Form.Item>

                    <Tag color="orange">支持 JPG / PNG / GIF / WEBP，不超过 5MB</Tag>
                </Form>
            </Modal>

            <Modal
                title="管理菜品分类"
                open={categoryModalOpen}
                onCancel={() => {
                    setCategoryModalOpen(false);
                    setEditingCategoryId(null);
                }}
                footer={null}
                width={480}
                destroyOnClose
            >
                <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
                    <Input
                        value={categoryName}
                        onChange={(event) => setCategoryName(event.target.value)}
                        placeholder="新分类名称，例如：热菜"
                        maxLength={20}
                        onPressEnter={() => void addCategory()}
                    />
                    <Button
                        type="primary"
                        loading={categorySubmitting}
                        onClick={() => void addCategory()}
                    >
                        添加
                    </Button>
                </Space.Compact>

                {categories.length === 0 ? (
                    <Empty description="还没有分类，请先添加" />
                ) : (
                    <div className="category-manage-list">
                        {categories.map((category) => (
                            <div className="category-manage-row" key={category.id}>
                                {editingCategoryId === category.id ? (
                                    <Input
                                        value={editingCategoryName}
                                        onChange={(event) =>
                                            setEditingCategoryName(event.target.value)
                                        }
                                        maxLength={20}
                                        onPressEnter={() => void saveCategory(category)}
                                    />
                                ) : (
                                    <Tag color="orange">{category.name}</Tag>
                                )}
                                <Space size={4}>
                                    {editingCategoryId === category.id ? (
                                        <>
                                            <Button
                                                type="link"
                                                size="small"
                                                loading={categorySubmitting}
                                                onClick={() => void saveCategory(category)}
                                            >
                                                保存
                                            </Button>
                                            <Button
                                                type="link"
                                                size="small"
                                                onClick={() => setEditingCategoryId(null)}
                                            >
                                                取消
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                type="link"
                                                size="small"
                                                onClick={() => {
                                                    setEditingCategoryId(category.id);
                                                    setEditingCategoryName(category.name);
                                                }}
                                            >
                                                重命名
                                            </Button>
                                            <Popconfirm
                                                title={`删除分类「${category.name}」？`}
                                                description="分类下还有菜品时不能删除。"
                                                okText="删除"
                                                cancelText="取消"
                                                okButtonProps={{ danger: true }}
                                                onConfirm={() => removeCategory(category)}
                                            >
                                                <Button type="link" danger size="small">
                                                    删除
                                                </Button>
                                            </Popconfirm>
                                        </>
                                    )}
                                </Space>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>
        </div>
    );
}
