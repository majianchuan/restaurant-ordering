import { Spin } from 'antd';

export function PageLoading() {
    return (
        <div className="page-loading">
            <Spin size="large" />
        </div>
    );
}
