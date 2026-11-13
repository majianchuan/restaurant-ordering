#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "$ROOT_DIR/frontend/dist/index.html" ]; then
    echo "[ERROR] 未找到前端构建产物 frontend/dist/index.html" >&2
    echo "请先执行：" >&2
    echo "    cd frontend" >&2
    echo "    pnpm install" >&2
    echo "    pnpm build" >&2
    exit 1
fi

echo "============================================"
echo "  餐厅点餐系统"
echo "  访问地址：http://localhost:8000"
echo "  按 Ctrl+C 停止服务"
echo "============================================"
echo

cd "$ROOT_DIR/backend"
exec php -S 0.0.0.0:8000 -t "$ROOT_DIR/frontend/dist" router.php
