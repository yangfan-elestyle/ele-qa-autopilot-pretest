/**
 * Mock Excel 源用例数据.
 * 占位用, 等真正把 OutputDisplayCore 的 Excel 表格状态接进来后下线.
 * 字段贴近 MeterSphere 功能用例, 方便后期回写 mapping.
 */

export interface ExcelCaseRow {
  id: string
  num: number
  name: string
  module: string
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  steps: string
  expected: string
  tags?: string[]
}

export const MOCK_EXCEL_CASES: ExcelCaseRow[] = [
  {
    id: 'mock-001',
    num: 1,
    name: '未注册手机号登录失败',
    module: '登录 / 异常路径',
    priority: 'P0',
    steps: '1. 打开登录页\n2. 输入未注册号码\n3. 点击发送验证码',
    expected: '提示"该号码未注册"',
    tags: ['login', 'negative'],
  },
  {
    id: 'mock-002',
    num: 2,
    name: '验证码 6 位数字成功登录',
    module: '登录 / 正常路径',
    priority: 'P0',
    steps: '1. 输入已注册号码\n2. 收取验证码\n3. 输入并提交',
    expected: '跳转首页, 顶部展示昵称',
    tags: ['login', 'positive'],
  },
  {
    id: 'mock-003',
    num: 3,
    name: '验证码错误超过 5 次锁定 30 分钟',
    module: '登录 / 安全',
    priority: 'P1',
    steps: '1. 连续 5 次输错验证码',
    expected: '锁定提示, 30 分钟内拒绝再次发送',
    tags: ['login', 'rate-limit'],
  },
  {
    id: 'mock-004',
    num: 4,
    name: '商品列表上拉加载下一页',
    module: '商品 / 列表',
    priority: 'P1',
    steps: '1. 浏览到底部\n2. 上拉',
    expected: '请求第 2 页, 追加渲染, 不重复',
    tags: ['listing'],
  },
  {
    id: 'mock-005',
    num: 5,
    name: '下单时使用过期优惠券应被拒绝',
    module: '交易 / 优惠券',
    priority: 'P0',
    steps: '1. 进入结算页\n2. 选择已过期的优惠券',
    expected: '提示券已过期, 不可勾选',
    tags: ['checkout', 'coupon'],
  },
  {
    id: 'mock-006',
    num: 6,
    name: '退出登录后清理本地 token',
    module: '登录 / 会话',
    priority: 'P2',
    steps: '1. 已登录\n2. 点击退出',
    expected: '本地存储 token / refresh_token 被清空',
    tags: ['session'],
  },
]
