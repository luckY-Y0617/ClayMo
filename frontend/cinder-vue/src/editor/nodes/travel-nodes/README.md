# Travel Nodes Skeleton

本目录用于承载 Travel 模式下的自定义 Tiptap 节点（如行程节点、时间线节点、地点卡片等）。

当前仅创建占位文件，尚未接入实际 schema / NodeView：

- 规划节点类型：
  - `travelDay`：按日期分组的行程块
  - `travelStop`：单个行程节点（地点 + 时间 + 备注）
  - `travelTimeline`：时间线容器

后续在 v2.0+ 阶段，可以参考 `src/editor/extensions/CodeBlock.js` 的写法，为 Travel 节点提供：

- 自定义 Node / NodeView
- Timeline 样式与地图/图片挂载位
- 与普通知识文档兼容的导出逻辑


