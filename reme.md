# 读书会小程序 - 功能扩展与代码增强规划

## 项目现状概述

本项目是一个基于**微信小程序原生框架** + **微信云开发（云函数）**构建的读书会/活动管理平台。采用前后端分离架构，前端使用微信小程序原生语法（WXML/WXSS/JS），后端通过云函数提供数据服务。核心功能包括：活动发布与管理、用户报名、打卡签到、新闻公告、后台管理、个人中心等。

---

## 一、可扩展功能模块（从0-1开发）

> 以下模块均为**全新独立功能**，与现有功能无重复，模块之间无依赖关系，且不涉及真实第三方API接入。

| 编号 | 模块名称 | 功能概述 | 核心交互 | 技术实现 |
|------|----------|----------|----------|----------|
| 1 | **书籍交换市集** | 用户可发布闲置书籍进行同城交换或赠送，形成读书会内部的书籍流转生态 | 发布书籍（上传封面、填写书名/作者/新旧程度）、浏览市集、点击"申请交换"、双方确认后生成交换订单 | 本地图片上传至云存储，书籍数据存入云数据库，交换状态机管理（待确认/已同意/已完成） |
| 2 | **读书会投票系统** | 针对下期读书主题、活动时间、地点等进行多选项投票 | 创建投票（单选/多选、截止时间）、分享投票卡片、实时查看投票结果柱状图、投票截止后自动通知 | 云数据库存储投票选项和记录，Canvas 绘制结果统计图，定时触发器处理过期状态 |
| 3 | **语音读书笔记** | 支持录制短语音作为读书笔记，替代纯文字输入 | 长按录音按钮录制（最长60秒）、播放他人语音笔记、变速播放、删除自己的录音 | 微信小程序 RecorderManager API，语音文件上传云存储，播放时使用 InnerAudioContext |
| 4 | **阅读挑战赛季** | 周期性发起的阅读挑战活动（如"21天读完一本书"），参与者每日打卡累积进度 | 加入挑战、每日打卡更新进度、查看排行榜（按完成天数/阅读时长排序）、获得虚拟勋章 | 本地计算连续打卡天数，云数据库存储挑战参与记录，排行榜使用聚合查询 |
| 5 | **小组学习室** | 用户可创建或加入私密/公开的学习小组，组内独立讨论和共享书单 | 创建小组（设置人数上限/入组审核）、申请加入、组内发布话题、组内活动独立管理 | 云数据库维护小组-用户关联表，消息使用分页加载，组长拥有管理权限字段 |
| 6 | **线下座位预约** | 针对有固定场地的读书会，提供活动座位图在线选座功能 | 上传座位图模板、活动关联座位图、用户点击选座（不同颜色表示已选/可选/预留）、取消预约释放座位 | Canvas 绘制座位图矩阵，座位状态存入云数据库，选座时事务锁防止超卖 |
| 7 | **读书心得涂鸦墙** | 公共的创意涂鸦板，用户可以用画笔在虚拟黑板上书写/绘画心得，所有人可见 | 选择画笔颜色/粗细、手指涂鸦、撤销上一步、一键清空、保存作品到墙、点赞他人作品 | Canvas 2D 绘图接口实现画板，涂鸦数据序列化为坐标点数组存储，分页加载展示 |
| 8 | **模拟读书会主持** | 提供线上模拟主持工具，包含计时器、环节提醒、随机抽人发言等功能 | 设置会议环节（破冰/分享/讨论/总结）和各环节时长、倒计时提醒、点击"随机抽取"高亮选中参与者、生成会议纪要模板 | 前端定时器管理，参与者名单本地随机算法，环节状态机控制流程 |
| 9 | **个人阅读档案** | 可视化统计个人历史阅读数据，生成年度/月度阅读报告 | 选择时间范围查看阅读书籍数量、参与活动次数、打卡天数趋势折线图、标签云展示偏好书籍类型 | 本地聚合历史数据，Canvas 绘制趋势图和饼图，支持生成图片保存相册 |
| 10 | **盲盒换书活动** | 定期发起的趣味换书活动，用户上传一本书，系统随机匹配交换对象 | 报名参与活动、填写书籍信息（不公开具体书名，只给标签提示）、系统截止后自动随机配对、双方确认后线下交换 | 报名截止后云函数执行随机匹配算法，匹配结果通过订阅消息通知 |
| 11 | **读书会知识竞答** | 围绕某本书籍内容设计的趣味答题竞赛，支持个人赛和团队赛 | 选择书籍进入答题、限时单选/多选、答对得分连续正确有连击加成、结束显示排名和错题回顾 | 题目数据本地预置或云数据库读取，倒计时动画，得分计算和排名排序 |
| 12 | **共读进度同步** | 多人同时阅读同一本书时，可标记自己的阅读页码，查看同伴的阅读进度条 | 创建共读房间、设置总页数、每次阅读后更新当前页码、房间成员列表显示各自进度百分比、到达关键页码自动提醒讨论 | 云数据库实时同步页码数据，进度条使用 progress 组件，WebSocket 模拟实时通知 |

---

## 二、可迭代功能模块（在已有功能上开发）

> 以下模块均基于**现有功能进行增强**，与可扩展模块无重复，模块之间无依赖。

| 编号 | 模块名称 | 功能概述 | 核心交互 | 技术实现 |
|------|----------|----------|----------|----------|
| 1 | **活动报名字段自定义** | 在现有活动报名基础上，支持组织者自定义报名表单字段（如是否需要带书、饮食忌口等） | 活动创建时点击"添加自定义字段"、选择字段类型（文本/单选/多选/数字）、报名者填写时动态渲染表单、后台导出包含自定义字段的Excel | 扩展现有活动数据模型的 formConfig 字段，表单渲染组件根据配置动态生成，云函数导出逻辑适配动态列 |
| 2 | **打卡富媒体支持** | 现有打卡功能从纯文字扩展为支持图片、语音、位置的多媒体打卡 | 打卡时点击"+"选择上传图片或录音、可选添加位置信息、打卡记录流以卡片形式展示多媒体内容、支持点赞和简短评论 | 复用现有云存储上传逻辑，打卡数据模型增加 mediaList 和 location 字段，列表页使用瀑布流布局 |
| 3 | **活动分类与筛选增强** | 现有活动列表增加更精细的分类体系和多维筛选能力 | 顶部标签栏增加分类（文学/历史/科技/心理等）、支持按时间（本周/本月/即将截止）筛选、按地点距离排序、搜索结果高亮 | 活动数据增加 category 和 tags 字段，筛选条件本地缓存，距离计算使用经纬度 Haversine 公式 |
| 4 | **报名审核流程优化** | 现有报名功能增加审核状态流转和通知机制 | 组织者设置报名方式（直接通过/需审核）、待审核列表显示申请人信息、一键通过/拒绝、申请人收到审核结果通知、可设置人数上限自动截止 | 报名状态从二元（已报名）扩展为三元（待审核/已通过/已拒绝），使用云函数触发器发送订阅消息 |
| 5 | **个人中心数据看板** | 在现有"我的"页面增加可视化数据统计卡片 | 页面顶部显示"今年已读X本""参与X次活动""连续打卡X天"等核心指标、点击卡片进入详情列表、支持分享数据卡片到朋友圈 | 复用现有用户行为数据，前端使用 flex 布局展示指标卡片，Canvas 生成分享图片 |
| 6 | **新闻公告评论互动** | 现有新闻公告从纯展示增加评论和点赞功能 | 公告详情页底部增加评论区、发表评论（支持emoji）、点赞评论、按时间/热度排序、评论数显示在列表页 | 云数据库新增 comment 集合关联 newsId，列表页聚合查询评论数量，评论输入框防抖动处理 |
| 7 | **后台数据批量操作** | 现有后台管理增加批量处理能力，提升管理员效率 | 活动/用户/报名列表支持多选（checkbox）、批量删除、批量导出、批量修改状态、全选/反选快捷操作 | 列表组件增加 selection 状态管理，批量操作调用云函数时传入 id 数组，事务批量处理 |
| 8 | **活动海报自动生成** | 基于现有活动信息，一键生成可分享的活动海报图片 | 活动详情页点击"生成海报"、选择海报模板、实时预览、保存到相册或转发给好友 | 使用 wxa-plugin-canvas 组件（项目中已引入），传入活动数据动态渲染海报内容 |
| 9 | **消息通知中心** | 在现有分散的通知基础上，统一聚合为消息中心 | "我的"页面新增消息入口图标、显示未读消息红点、消息列表按时间倒序、支持标记已读/全部已读、消息类型筛选（活动/报名/系统） | 云数据库维护 message 集合，按 userId 分片查询，页面 onShow 时刷新未读数 |
| 10 | **用户标签与分组** | 后台管理增加给用户打标签和分组功能，便于精准运营 | 后台用户详情页添加标签（如"活跃用户""资深书友"）、按标签筛选用户、给指定标签组群发活动通知 | 用户数据模型增加 tags 数组字段，标签管理独立集合，群发时使用云函数循环发送订阅消息 |

---

## 三、代码理解建议

### 建议1：云函数路由与权限架构深度理解

**分析目标**：理解云函数 `mcloud` 的请求路由分发机制、控制器-服务-模型分层逻辑，以及权限校验的完整链路。

**分析步骤**：
1. 阅读 `cloudfunctions/mcloud/index.js`，理解请求入口如何根据 `route` 参数分发到不同控制器
2. 阅读 `cloudfunctions/mcloud/framework/` 目录下的核心文件，特别是路由注册、中间件执行流程
3. 选取一个具体业务（如活动管理），追踪 `admin_activity_add` -> `activity_service.js` -> `activity_model.js` 的完整调用链
4. 分析权限校验逻辑：管理员登录态如何校验、普通用户与管理员接口如何区分、数据权限（只能改自己的数据）如何实现

**输出内容**：
- 云函数请求生命周期图（从微信客户端调用到数据库返回的完整链路）
- 控制器/服务/模型三层的职责边界和调用约定
- 权限中间件的执行时机和校验规则清单
- 现有架构的优点（如统一错误处理）和可优化点（如重复校验逻辑）

---

### 建议2：小程序页面生命周期与数据流理解

**分析目标**：理解小程序页面从加载到卸载的完整生命周期中，数据如何初始化、渲染、更新和销毁，以及全局状态（App）与页面状态的协作方式。

**分析步骤**：
1. 阅读 `miniprogram/app.js`，分析 `globalData` 的结构和用途，以及全局登录态的维护方式
2. 选取一个复杂页面（如 `activity_detail`），追踪 `onLoad` -> `onShow` -> `onReady` -> `onHide` -> `onUnload` 各阶段的数据操作
3. 分析页面间数据传递方式：URL参数、全局事件总线、Storage 缓存、页面栈 `getCurrentPages()` 的使用场景
4. 检查是否存在内存泄漏风险：如 `setInterval` 未清理、页面卸载时未取消网络请求、全局事件未解绑

**输出内容**：
- 典型页面的数据流时序图（文字描述）
- 全局状态与页面状态的同步机制说明
- 页面间通信方式的使用场景对比表
- 发现的潜在内存泄漏点和修复建议

---

### 建议3：组件化架构与复用机制理解

**分析目标**：理解项目中公共组件（`cmpts/public/`）和业务组件（`cmpts/biz/`）的设计思路、通信方式和复用策略。

**分析步骤**：
1. 阅读 `cmpts/public/` 下的通用组件源码，如 `comm_list_cmpt`、`modal_cmpt`、`picker_cmpt`，分析其 Props 定义和事件抛出机制
2. 阅读 `cmpts/biz/` 下的业务组件，如 `foot_cmpt`、`detail_cmpt`，对比与公共组件的差异
3. 分析组件在页面中的引用方式（`usingComponents`）和数据传递路径
4. 检查组件的抽象粒度是否合理：是否存在过度设计或抽象不足的情况

**输出内容**：
- 组件分层架构图（基础组件 -> 业务组件 -> 页面）
- 各公共组件的输入输出接口清单
- 组件复用率统计和重复代码识别
- 组件设计模式总结（如观察者模式在事件通信中的应用）

---

## 四、代码重构建议

### 建议1：云函数控制器逻辑瘦身重构

**问题识别**：
- 云函数控制器层（`controller/`）可能包含大量业务逻辑，导致控制器臃肿，违背"薄控制器、厚服务"原则
- 参数校验逻辑可能在多个控制器中重复编写
- 错误处理可能使用硬编码的返回格式，缺乏统一封装

**重构方案**：
1. **提取通用参数校验中间件**：
   ```javascript
   // framework/middleware/validator.js
   const validate = (rules) => {
     return async (ctx, next) => {
       const errors = [];
       for (const [field, rule] of Object.entries(rules)) {
         const value = ctx.data[field];
         if (rule.required && !value) errors.push(`${field}不能为空`);
         if (rule.type && typeof value !== rule.type) errors.push(`${field}类型错误`);
       }
       if (errors.length > 0) return ctx.fail('参数错误', errors);
       await next();
     };
   };
   ```

2. **统一响应格式封装**：
   ```javascript
   // framework/utils/response.js
   const response = {
     success: (data = null, msg = '操作成功') => ({ code: 200, data, msg }),
     fail: (msg = '操作失败', errors = null) => ({ code: 400, msg, errors }),
     unauthorized: () => ({ code: 401, msg: '未授权' })
   };
   ```

3. **将业务逻辑下沉至 Service 层**：控制器只负责接收参数、调用服务、返回结果，所有数据库操作和业务规则判断移至 Service

**预期收益**：
- 控制器代码量减少 50%+
- 新增接口时开发效率提升（复用校验和响应封装）
- 单元测试更容易编写（Service 层可独立测试）

---

### 建议2：小程序页面逻辑抽象与Mixin复用

**问题识别**：
- 多个页面可能存在重复的生命周期逻辑（如登录态检查、列表分页加载、下拉刷新）
- 页面 JS 文件中 `data` 和 `methods` 可能非常冗长，缺乏模块化拆分
- 相似页面的列表加载逻辑（如活动列表、报名列表、用户列表）代码高度重复

**重构方案**：
1. **创建页面行为 Mixin**：
   ```javascript
   // miniprogram/mixins/paginated-list.js
   module.exports = {
     data: {
       list: [],
       page: 1,
       pageSize: 10,
       isLoading: false,
       hasMore: true
     },
     methods: {
       async loadList(fetchFn) {
         if (this.data.isLoading || !this.data.hasMore) return;
         this.setData({ isLoading: true });
         const res = await fetchFn(this.data.page, this.data.pageSize);
         this.setData({
           list: this.data.page === 1 ? res.data : [...this.data.list, ...res.data],
           hasMore: res.data.length === this.data.pageSize,
           page: this.data.page + 1,
           isLoading: false
         });
       },
       onReachBottom() {
         this.loadList(this.fetchList);
       },
       onPullDownRefresh() {
         this.setData({ page: 1, hasMore: true }, () => {
           this.loadList(this.fetchList).then(() => wx.stopPullDownRefresh());
         });
       }
     }
   };
   ```

2. **页面中复用 Mixin**：
   ```javascript
   // 页面 js
   const paginatedListMixin = require('../../../../mixins/paginated-list');
   Page({
     ...paginatedListMixin,
     data: {
       ...paginatedListMixin.data,
       // 页面特有数据
     },
     async fetchList(page, pageSize) {
       return await cloudHelper.callSumbit('admin/activity/list', { page, pageSize });
     }
   });
   ```

3. **提取通用工具函数到独立模块**：如时间格式化、数据缓存、权限判断等

**预期收益**：
- 列表相关页面代码量减少 40%+
- 分页逻辑 bug 修复只需改一处
- 新页面开发时可快速复用成熟模式

---

### 建议3：云数据库索引与查询优化重构

**问题识别**：
- 随着数据量增长，某些查询（如按时间范围查活动、按用户ID查报名记录）可能未建立索引导致查询缓慢
- 可能存在 N+1 查询问题（如查询活动列表后，循环查询每个活动的报名人数）
- 大量数据导出时可能一次性读取导致内存溢出

**重构方案**：
1. **梳理并补充数据库索引**：
   ```javascript
   // 在集合管理后台或通过云函数创建索引
   // activity 集合：{ status: 1, startTime: -1 }
   // enroll 集合：{ activityId: 1, userId: 1 }
   // user 集合：{ createTime: -1 }
   ```

2. **聚合查询替代循环查询**：使用 `db.command.aggregate` 的 `$lookup` 或云函数的多次查询合并为一次聚合

3. **大数据量分页导出**：
   ```javascript
   // 导出时采用流式分批读取
   async function exportInBatches(collection, where, batchSize = 500) {
     let offset = 0;
     const allData = [];
     while (true) {
       const batch = await collection.where(where).skip(offset).limit(batchSize).get();
       if (batch.data.length === 0) break;
       allData.push(...batch.data);
       offset += batchSize;
     }
     return allData;
   }
   ```

**预期收益**：
- 列表查询响应时间减少 60%+
- 避免大数据导出导致云函数超时或内存超限
- 数据库费用降低（减少全表扫描）

---

## 五、代码测试建议

### 建议1：云函数单元测试体系搭建

**测试框架选择**：Jest（Node.js 环境原生支持）

**测试范围**：
1. **工具函数测试**（`framework/utils/` 下的独立函数）
   - 时间格式化、数据校验、加密解密等纯函数的输入输出测试
   - 边界条件测试（如空值、超长字符串、特殊字符）

2. **Service 层业务逻辑测试**
   - 使用 `jest.mock` 模拟云数据库操作
   - 测试活动创建时的字段校验逻辑
   - 测试报名时的并发人数限制判断

3. **控制器层接口测试**
   - 模拟微信云函数的 `event` 和 `context` 参数
   - 测试正常请求和异常请求的返回格式

**测试代码示例**：
```javascript
// cloudfunctions/mcloud/__tests__/utils/util.test.js
const { formatTime, isValidPhone } = require('../../framework/utils/util');

describe('工具函数测试', () => {
  test('formatTime 格式化时间戳', () => {
    expect(formatTime(1609459200000)).toBe('2021-01-01 00:00:00');
  });

  test('isValidPhone 校验手机号', () => {
    expect(isValidPhone('13800138000')).toBe(true);
    expect(isValidPhone('1380013800')).toBe(false);
    expect(isValidPhone('')).toBe(false);
  });
});

// cloudfunctions/mcloud/__tests__/service/activity_service.test.js
const ActivityService = require('../../projects/activitybook/service/activity_service');

jest.mock('wx-server-sdk', () => ({
  init: jest.fn(),
  database: jest.fn(() => ({
    collection: jest.fn(() => ({
      add: jest.fn(() => Promise.resolve({ _id: 'mock-id' }))
    }))
  }))
}));

describe('ActivityService', () => {
  test('创建活动时缺少必填字段应抛出异常', async () => {
    const service = new ActivityService();
    await expect(service.create({ title: '' })).rejects.toThrow('活动标题不能为空');
  });
});
```

**测试覆盖率目标**：
- 工具函数覆盖率 >= 90%
- Service 层核心业务流程覆盖率 >= 80%
- 控制器层接口覆盖率 >= 70%

---

### 建议2：小程序端集成测试与自动化验证

**测试框架选择**：Miniprogram-automator（微信官方自动化测试工具）

**测试场景**：
1. **核心用户旅程测试**：
   - 用户登录 -> 浏览活动列表 -> 进入活动详情 -> 点击报名 -> 填写信息 -> 提交 -> 查看我的报名
   - 验证每个环节的页面跳转、数据展示、按钮状态变化是否正确

2. **后台管理流程测试**：
   - 管理员登录 -> 创建活动 -> 发布活动 -> 查看报名列表 -> 导出报名数据
   - 验证表单校验、数据保存、列表刷新、文件下载

3. **边界场景测试**：
   - 网络异常时的错误提示
   - 无数据时的空状态展示
   - 表单提交中的 loading 状态和防重复提交

**测试配置要点**：
```javascript
// e2e/login.test.js
const automator = require('miniprogram-automator');

let miniProgram;

beforeAll(async () => {
  miniProgram = await automator.launch({
    projectPath: '/Users/tog/Downloads/TReading-master',
    cliPath: '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
  });
}, 30000);

afterAll(async () => {
  await miniProgram.close();
});

test('用户完整报名流程', async () => {
  const page = await miniProgram.reLaunch('/projects/activitybook/pages/activity/index/activity_index');
  await page.waitFor(1000);
  
  // 点击第一个活动
  const activityItem = await page.$('.activity-item');
  await activityItem.tap();
  await page.waitFor(500);
  
  // 点击报名按钮
  const joinBtn = await page.$('.join-btn');
  expect(await joinBtn.text()).toBe('立即报名');
  await joinBtn.tap();
  
  // 填写表单并提交
  await page.setData({ formName: '测试用户', formPhone: '13800138000' });
  const submitBtn = await page.$('.submit-btn');
  await submitBtn.tap();
  await page.waitFor(1000);
  
  // 验证跳转到报名成功页
  const successPage = await miniProgram.currentPage();
  expect(successPage.path).toContain('activity_join');
});
```

**持续集成建议**：
- 在代码提交前运行云函数单元测试
- 每晚定时运行小程序自动化测试（因需要微信开发者工具，适合在本地或特定CI环境执行）
- 测试失败时通过企业微信/邮件通知相关负责人

---

### 建议3：静态代码分析与质量门禁

**工具选择**：ESLint + 自定义规则

**实施内容**：
1. **配置 ESLint 规则**：
   ```json
   // .eslintrc.json
   {
     "extends": ["eslint:recommended"],
     "env": {
       "node": true,
       "jest": true
     },
     "rules": {
       "no-console": ["warn", { "allow": ["error"] }],
       "no-unused-vars": "error",
       "eqeqeq": ["error", "always"],
       "curly": ["error", "all"],
       "max-lines-per-function": ["warn", 50],
       "complexity": ["warn", 10]
     }
   }
   ```

2. **云函数代码质量门禁**：
   - 函数行数不超过 50 行（强制拆分）
   - 圈复杂度不超过 10（避免过多分支）
   - 禁止直接操作数据库的代码出现在 Controller 层

3. **小程序端质量规则**：
   - 禁止在 `onUnload` 之外的地方使用 `getCurrentPages()` 修改其他页面数据
   - 强制 `setData` 前检查数据是否真正变化（减少无效渲染）
   - 禁止在循环中调用 `setData`

**预期收益**：
- 在编码阶段拦截 30%+ 的潜在 bug
- 统一团队代码风格，降低 Code Review 成本
- 通过复杂度限制倒逼函数拆分，提升可维护性

---

## 六、代码工程化建议

### 建议1：开发环境与部署流程规范化

**实施内容**：

1. **多环境配置管理**：
   - 建立 `dev` / `test` / `prod` 三套云环境
   - 使用配置文件区分环境变量（数据库集合前缀、云存储路径、调试开关）
   ```javascript
   // config/env.dev.js
   module.exports = {
     env: 'dev',
     dbPrefix: 'dev_',
     logLevel: 'debug'
   };
   ```

2. **云函数版本管理与灰度发布**：
   - 使用微信开发者工具的"云函数版本管理"功能
   - 关键云函数更新时先发布到 5% 用户验证，再全量发布
   - 保留最近 5 个版本以便快速回滚

3. **数据库变更管理**：
   - 建立 `migrations/` 目录记录所有数据结构变更脚本
   - 新增字段时提供默认值或数据迁移脚本
   ```javascript
   // migrations/20240101_add_activity_category.js
   const db = wx.cloud.database();
   exports.up = async () => {
     const activities = await db.collection('activity').get();
     for (const item of activities.data) {
       await db.collection('activity').doc(item._id).update({
         data: { category: '其他' } // 默认值
       });
     }
   };
   ```

4. **Git 提交规范**：
   - 采用 Conventional Commits 规范
   ```
   feat(activity): 增加活动分类筛选功能
   fix(enroll): 修复报名人数超过上限仍可提交的问题
   refactor(cloud): 提取通用参数校验中间件
   docs(readme): 更新安装说明
   ```

**预期收益**：
- 生产环境故障可快速回滚，降低事故影响
- 多人协作时减少环境配置冲突
- 数据结构变更有据可查，避免线上数据不一致

---

### 建议2：性能监控与优化工程化

**实施内容**：

1. **小程序端性能埋点**：
   - 在 `app.js` 中封装性能监控工具，自动上报关键指标
   ```javascript
   // utils/perf.js
   const PerfMonitor = {
     reportPageLoad(pageName, duration) {
       if (duration > 2000) {
         console.warn(`页面 ${pageName} 加载耗时 ${duration}ms，建议优化`);
         // 上报到云数据库或日志服务
       }
     },
     reportApiLatency(apiName, duration, success) {
       // 记录云函数调用耗时分布
     }
   };
   ```

2. **云函数性能监控**：
   - 在每个云函数入口记录执行耗时和内存使用
   - 超过 3 秒的请求自动标记为慢请求，触发告警
   ```javascript
   // 云函数入口统一封装
   exports.main = async (event, context) => {
     const startTime = Date.now();
     try {
       const result = await router.dispatch(event, context);
       const duration = Date.now() - startTime;
       if (duration > 3000) {
         await db.collection('slow_logs').add({
           data: { route: event.route, duration, time: new Date() }
         });
       }
       return result;
     } catch (err) {
       // 错误上报...
     }
   };
   ```

3. **包体积优化**：
   - 使用微信开发者工具的"代码依赖分析"功能，识别未使用的组件和代码
   - 图片资源压缩（使用 tinypng 或云存储的图片处理参数）
   - 按需加载非核心页面（分包加载配置）
   ```json
   // app.json 中配置分包
   "subpackages": [
     {
       "root": "projects/activitybook/pages/admin/",
       "pages": [
         "index/home/admin_home",
         "activity/list/admin_activity_list"
         // ...其他后台页面
       ]
     }
   ]
   ```

4. **数据库查询优化清单**：
   - 所有 `where` 查询必须命中索引（通过云开发控制台"性能分析"验证）
   - 限制单次查询返回字段（`field()`），避免传输无用数据
   - 热点数据（如活动列表）增加本地缓存策略（Storage + 过期时间）

**预期收益**：
- 页面加载时间减少 30%+
- 云函数超时率降低至 0.1% 以下
- 主包体积控制在 2MB 以内，确保低端机流畅运行
- 建立性能基线，后续迭代可量化评估性能影响

---

### 建议3：代码文档与知识沉淀工程化

**实施内容**：

1. **云函数接口文档自动生成**：
   - 使用 JSDoc 注释规范描述每个云函数的入参和出参
   - 编写脚本扫描 `controller/` 目录，自动生成接口文档 Markdown
   ```javascript
   /**
    * 创建活动
    * @route admin/activity/add
    * @param {string} title 活动标题（必填，最长50字）
    * @param {string} content 活动内容（必填）
    * @param {number} maxJoin 最大报名人数（必填，1-999）
    * @returns {Object} { code: 200, data: { id: '活动ID' } }
    */
   async addActivity(event) { ... }
   ```

2. **业务规则文档化**：
   - 在 `docs/business-rules.md` 中维护核心业务规则
   - 如：报名截止时间必须早于活动开始时间、每人每天只能打卡一次、活动取消后自动退款逻辑等
   - 代码中涉及业务判断的地方注释引用文档条款编号

3. **新人上手指南**：
   - `docs/onboarding.md`：环境搭建、账号申请、常用命令、调试技巧
   - `docs/architecture.md`：系统架构图、数据流说明、关键设计决策记录（ADR）
   - `docs/faq.md`：常见问题及解决方案（如云函数本地调试、数据库权限错误等）

4. **代码走查（Code Review）清单**：
   - 创建 Pull Request 模板，强制检查项：
     - [ ] 是否补充了单元测试
     - [ ] 是否更新了接口文档
     - [ ] 是否验证了数据库索引
     - [ ] 是否检查了小程序包体积变化
     - [ ] 是否考虑了向后兼容（数据结构变更时）

**预期收益**：
- 新成员上手时间从 3 天缩短至 1 天
- 业务规则变更时可快速定位需要修改的代码位置
- 减少因口头传递导致的知识丢失和误解
- Code Review 效率提升，关注点从风格问题转向架构设计

---

## 附录：功能模块优先级建议

| 优先级 | 可扩展模块 | 可迭代模块 | 理由 |
|--------|-----------|-----------|------|
| P0 | 书籍交换市集 | 活动报名字段自定义 | 直接提升用户活跃度和组织者效率 |
| P1 | 语音读书笔记、阅读挑战赛季 | 打卡富媒体支持、活动分类筛选 | 增强核心功能体验，技术风险低 |
| P2 | 小组学习室、盲盒换书活动 | 报名审核流程、个人中心数据看板 | 增加社交属性，需一定开发量 |
| P3 | 线下座位预约、涂鸦墙、模拟主持 | 新闻评论、后台批量操作 | 锦上添花，可后续迭代 |

---

*文档生成日期：2026-08-01*
*适用项目：TReading 读书会小程序*
