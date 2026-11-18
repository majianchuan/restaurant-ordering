import { useCallback, useEffect, useRef, useState } from 'react';
import {
    App as AntdApp,
    Button,
    Card,
    Col,
    Empty,
    Progress,
    Rate,
    Row,
    Spin,
    Statistic,
    Tag,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import { adminApi, getErrorMessage } from '../../api/client';
import type { StatsResponse } from '../../types';

function RevenueChart({ week }: { week: StatsResponse['week'] }) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!containerRef.current) {
            return;
        }

        const chart = echarts.init(containerRef.current);
        chart.setOption({
            tooltip: { trigger: 'axis' },
            legend: {
                data: ['营业额', '订单数'],
                top: 0,
                textStyle: { color: '#6b7280' },
            },
            grid: { left: 12, right: 16, top: 42, bottom: 8, containLabel: true },
            xAxis: {
                type: 'category',
                data: week.map((item) => item.label),
                axisLine: { lineStyle: { color: '#e5e7eb' } },
                axisLabel: { color: '#6b7280' },
            },
            yAxis: [
                {
                    type: 'value',
                    name: '营业额',
                    nameTextStyle: { color: '#9ca3af' },
                    splitLine: { lineStyle: { color: '#f3f4f6' } },
                    axisLabel: { color: '#6b7280' },
                },
                {
                    type: 'value',
                    name: '订单数',
                    nameTextStyle: { color: '#9ca3af' },
                    splitLine: { show: false },
                    axisLabel: { color: '#6b7280' },
                },
            ],
            series: [
                {
                    name: '营业额',
                    type: 'bar',
                    barWidth: 22,
                    itemStyle: { color: '#fa541c', borderRadius: [6, 6, 0, 0] },
                    data: week.map((item) => Number(item.revenue)),
                },
                {
                    name: '订单数',
                    type: 'line',
                    yAxisIndex: 1,
                    smooth: true,
                    symbolSize: 7,
                    lineStyle: { color: '#1677ff', width: 2 },
                    itemStyle: { color: '#1677ff' },
                    data: week.map((item) => item.orders),
                },
            ],
        });

        const handleResize = () => chart.resize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.dispose();
        };
    }, [week]);

    return <div ref={containerRef} className="dashboard-chart" />;
}

export function DashboardTab() {
    const { message } = AntdApp.useApp();
    const [stats, setStats] = useState<StatsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setStats(await adminApi.stats());
        } catch (error) {
            message.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [message]);

    useEffect(() => {
        void load();
    }, [load]);

    if (loading || !stats) {
        return (
            <div className="tab-loading">
                <Spin />
            </div>
        );
    }

    const maxQuantity = Math.max(1, ...stats.topDishes.map((dish) => dish.quantity));

    return (
        <div>
            <div className="panel-toolbar">
                <div>
                    <h2>经营概览</h2>
                    <span className="toolbar-subtitle">
                        数据来自订单、菜品与评价表，实时查询
                    </span>
                </div>
                <Button icon={<ReloadOutlined />} onClick={() => void load()}>
                    刷新
                </Button>
            </div>

            <Row gutter={[16, 16]}>
                <Col xs={12} md={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="今日营业额"
                            value={Number(stats.today.revenue)}
                            precision={2}
                            prefix="¥"
                            valueStyle={{ color: '#fa541c' }}
                        />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card className="stat-card">
                        <Statistic title="今日订单" value={stats.today.orders} suffix="单" />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="待处理订单"
                            value={stats.today.activeOrders}
                            suffix="单"
                            valueStyle={{ color: '#fa8c16' }}
                        />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="注册顾客"
                            value={stats.today.customers}
                            suffix="人"
                            valueStyle={{ color: '#1677ff' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} lg={15}>
                    <Card title="近 7 天营业趋势" className="dashboard-card">
                        <RevenueChart week={stats.week} />
                    </Card>
                </Col>
                <Col xs={24} lg={9}>
                    <Card title="热销菜品" className="dashboard-card">
                        {stats.topDishes.length === 0 ? (
                            <Empty description="暂无已结账订单" />
                        ) : (
                            <div className="top-dishes">
                                {stats.topDishes.map((dish, index) => (
                                    <div className="top-dish" key={dish.name}>
                                        <div className="top-dish-head">
                                            <span>
                                                <b>{index + 1}</b> {dish.name}
                                            </span>
                                            <span>¥{dish.revenue}</span>
                                        </div>
                                        <Progress
                                            percent={Math.round(
                                                (dish.quantity / maxQuantity) * 100
                                            )}
                                            showInfo={false}
                                            strokeColor="#fa541c"
                                        />
                                        <span className="top-dish-quantity">
                                            售出 {dish.quantity} 份
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} lg={15}>
                    <Card title="最新评价" className="dashboard-card">
                        {stats.recentReviews.length === 0 ? (
                            <Empty description="暂无顾客评价" />
                        ) : (
                            <div className="review-list">
                                {stats.recentReviews.map((review) => (
                                    <div className="review-item" key={review.id}>
                                        <div className="review-head">
                                            <strong>{review.nickname}</strong>
                                            <Rate disabled value={review.rating} />
                                            <span className="review-date">
                                                {review.menuName}
                                            </span>
                                        </div>
                                        <p>{review.content || '该顾客没有填写文字评价'}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={9}>
                    <Card title="经营数据" className="dashboard-card">
                        <div className="dashboard-counts">
                            <div>
                                <span>在售菜品</span>
                                <b>{stats.counts.menu}</b>
                            </div>
                            <div>
                                <span>餐桌数量</span>
                                <b>{stats.counts.tables}</b>
                            </div>
                            <div>
                                <span>注册顾客</span>
                                <b>{stats.counts.customers}</b>
                            </div>
                        </div>
                        <div className="status-counts">
                            <Tag color="orange">待制作 {stats.statusCounts.pending}</Tag>
                            <Tag color="green">待结账 {stats.statusCounts.served}</Tag>
                            <Tag>已结账 {stats.statusCounts.paid}</Tag>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
