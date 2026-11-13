import { Button, InputNumber } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';

interface QuantityEditorProps {
    value: number;
    onChange: (value: number) => void;
    max?: number;
}

export function QuantityEditor({ value, onChange, max = 99 }: QuantityEditorProps) {
    return (
        <div className="quantity-editor">
            <Button
                shape="circle"
                size="small"
                icon={<MinusOutlined />}
                onClick={() => onChange(value - 1)}
                disabled={value <= 0}
                aria-label="减少数量"
            />
            <InputNumber
                className="quantity-input"
                min={0}
                max={max}
                precision={0}
                controls={false}
                value={value}
                onChange={(next) => onChange(typeof next === 'number' ? next : 0)}
            />
            <Button
                shape="circle"
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => onChange(value + 1)}
                disabled={value >= max}
                aria-label="增加数量"
            />
        </div>
    );
}
