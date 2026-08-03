# 背景

读书会小程序：随着人们生活节奏的加快和信息的爆炸性增长，读书会作为一种集体学习和交流的方式逐渐受到欢迎。为了提高读书会的组织效率和参与度，读书会小程序将成为一个有益的工具。该小程序旨在为读书会提供统一的平台，方便组织者管理活动、参与者报名，并为参与者提供便捷的沟通和学习交流渠道。

本项目基于 **微信原生小程序 + 微信云开发** 实现。

# 功能

## 基础功能

- 活动管理：组织者可以轻松创建、编辑和取消读书会活动，管理活动的时间、地点、参与人数等信息。
- 参与报名：用户可以通过小程序浏览并报名参加感兴趣的读书会活动，提供简单而便捷的报名渠道。
- 书单推荐：小程序可以根据用户的阅读兴趣推荐相关书籍，促进读书会的多样化和深度。
- 学习资源分享：读书会成员可以在小程序上分享学习资源、笔记、心得等，推动学习交流和共享精神。
- 阅读打卡。

## 本次迭代新增功能

### 1. 自定义报名表单字段

组织者在创建/编辑活动时，可在"用户报名填写资料设置"中点击「添加新字段」自由配置报名表：

- 支持字段类型：单行文本、多行文本、单项选择（radio/select）、多项选择（checkbox）、整数数字、小数数字、开关、日期、省市区、手机号、身份证等。
- 每个字段可设置：字段名称、填写说明、是否必填、最小/最大字数（或张数）、可选项、重复次数限制等。
- 报名者填写时，表单按配置动态渲染；系统自动校验必填、字数、数字格式、手机号/身份证格式等。
- 后台报名名单导出 Excel 时，表头根据活动自定义字段动态生成，完整包含所有自定义字段内容。

相关代码：

- 字段配置器：[form_set_cmpt](miniprogram/cmpts/public/form/form_set/form_set_cmpt.js)、[form_set_field.js](miniprogram/cmpts/public/form/form_set/field/form_set_field.js)
- 字段类型与校验：[form_set_helper.js](miniprogram/cmpts/public/form/form_set_helper.js)
- 动态表单渲染：[form_show_cmpt](miniprogram/cmpts/public/form/form_show/form_show_cmpt.js)
- 动态导出：[admin_activity_service.js](cloudfunctions/mcloud/project/activitybook/service/admin/admin_activity_service.js) 的 `exportActivityJoinDataExcel`

### 2. 多媒体打卡

打卡由纯文字扩展为支持图片、语音、位置：

- 图片：最多 9 张，九宫格预览，删除单张。
- 语音：按住/点击录音，最长 60 秒，录制完成可试听、重录、删除。
- 位置：调用微信地图选点，记录位置名称、地址及经纬度，展示时可一键打开地图导航。
- 打卡详情、打卡动态列表、我的打卡列表均完整展示图片相册、语音条、位置卡片。

相关代码：

- 打卡提交页：[enroll_do.js](miniprogram/projects/activitybook/pages/enroll/do/enroll_do.js)
- 打卡详情页：[enroll_detail.js](miniprogram/projects/activitybook/pages/enroll/detail/enroll_detail.js)
- 数据模型：[enroll_join_model.js](cloudfunctions/mcloud/project/activitybook/model/enroll_join_model.js)（新增 `ENROLL_JOIN_PICS`、`ENROLL_JOIN_VOICE`、`ENROLL_JOIN_LOCATION`）
- 打卡活动多媒体配置：[enroll_model.js](cloudfunctions/mcloud/project/activitybook/model/enroll_model.js)（`ENROLL_MEDIA_SET` 位运算）

### 3. 报名审核状态流转与通知

- 组织者创建活动时可选择报名方式：**直接通过 / 需审核**（`ACTIVITY_CHECK_SET`）。
- 可设置人数上限，达到上限自动截止报名。
- 后台「活动名单」提供待审核/已通过/未通过筛选，显示申请人填写的全部资料，一键通过/拒绝，拒绝可填写理由。
- 支持批量审核（批量通过、批量拒绝并填写理由）。
- 审核完成后，通过微信**订阅消息**向申请人发送审核结果通知（含活动名称、审核结果、理由），点击通知可跳转"我的报名"。模板 ID 在 [config.js](cloudfunctions/mcloud/config/config.js) 的 `ACTIVITY_SUBSCRIBE_TEMPLATE_ID` 配置，未配置则静默跳过。
- 报名状态：0=待审核、1=报名成功、99=审核未过。

相关代码：

- 审核服务：[admin_activity_service.js](cloudfunctions/mcloud/project/activitybook/service/admin/admin_activity_service.js) 的 `statusActivityJoin`、`batchStatusActivityJoin`、`_sendAuditSubscribeMessage`
- 订阅消息封装：[cloud_base.js](cloudfunctions/mcloud/framework/cloud/cloud_base.js) 的 `sendSubscribeMessage`
- 审核名单页：[admin_activity_join_list.js](miniprogram/projects/activitybook/pages/admin/activity/join_list/admin_activity_join_list.js)
- 报名模型：[activity_join_model.js](cloudfunctions/mcloud/project/activitybook/model/activity_join_model.js)

### 4. "我的"页面可视化数据统计

在"我的"页面新增数据统计卡片：

- 报名活动数、报名成功数、签到次数。
- 打卡总次数、打卡天数、收藏数。
- 近 30 天打卡趋势折线图（基于 wxcharts 绘制）。

相关代码：

- 页面：[my_index.js](miniprogram/projects/activitybook/pages/my/index/my_index.js)、[my_index.wxml](miniprogram/projects/activitybook/pages/my/index/my_index.wxml)
- 统计接口：[my_service.js](cloudfunctions/mcloud/project/activitybook/service/my_service.js) 的 `getMyStat`、[my_controller.js](cloudfunctions/mcloud/project/activitybook/controller/my_controller.js)

### 5. 后台批量操作

后台各管理列表新增批量操作模式（顶部"批量操作"按钮进入，底部浮动操作栏）：

- 活动名单：批量审核通过、批量审核拒绝（填理由）、批量删除。
- 活动管理：批量启用/停用、批量删除。
- 打卡活动：批量启用/停用、批量删除。
- 打卡记录：批量删除。
- 用户管理：批量打标签（追加/移除/覆盖）、批量分组、批量启用/禁用、批量删除。

相关代码：

- 活动/报名：[admin_activity_controller.js](cloudfunctions/mcloud/project/activitybook/controller/admin/admin_activity_controller.js)、[admin_activity_join_list](miniprogram/projects/activitybook/pages/admin/activity/join_list/admin_activity_join_list.js)
- 打卡：[admin_enroll_controller.js](cloudfunctions/mcloud/project/activitybook/controller/admin/admin_enroll_controller.js)
- 用户：[admin_user_controller.js](cloudfunctions/mcloud/project/activitybook/controller/admin/admin_user_controller.js)、[admin_user_list](miniprogram/projects/activitybook/pages/admin/user/list/admin_user_list.js)
- 公共批量操作样式：`miniprogram/style/public/admin.wxss`

### 6. 活动海报生成与分享

基于已有 canvas 海报插件升级：

- 一键生成可分享的活动海报图片，包含活动封面、标题、时间、地点、小程序码。
- 提供多套海报模板（简约蓝、活力橙、清新绿），可点击色块实时切换并重新生成预览。
- 支持保存到相册、转发给朋友。

相关代码：

- 海报组件：[poster_cmpt.js](miniprogram/cmpts/public/poster/poster_cmpt.js)、[poster_cmpt.wxml](miniprogram/cmpts/public/poster/poster_cmpt.wxml)
- 海报绘制引擎：`miniprogram/cmpts/public/poster/wxa-plugin-canvas/`

### 7. 用户标签与分组

后台用户管理体系新增标签和分组能力：

- **标签管理**：新建/编辑/删除标签，自定义标签名称、颜色（8 种预设色）、排序；自动统计每个标签的使用人数。
- **分组管理**：新建/编辑/删除分组，自动统计人数。
- **用户详情**：可为单个用户勾选多个标签、设置所属分组。
- **用户列表**：展示用户标签（彩色标签）和分组名，顶部提供"标签管理""分组管理"入口。
- **批量打标签/分组**：在用户列表批量模式下可批量追加、移除、覆盖标签或批量设置分组。
- 可按标签/分组筛选用户（后端搜索菜单已支持）。

相关代码：

- 标签模型：[user_tag_model.js](cloudfunctions/mcloud/project/activitybook/model/user_tag_model.js)
- 分组模型：[user_group_model.js](cloudfunctions/mcloud/project/activitybook/model/user_group_model.js)
- 用户模型扩展：[user_model.js](cloudfunctions/mcloud/project/activitybook/model/user_model.js)（新增 `USER_TAGS`、`USER_GROUP`、`USER_MEMO`）
- 标签/分组服务：[admin_user_service.js](cloudfunctions/mcloud/project/activitybook/service/admin/admin_user_service.js)
- 标签管理页：`miniprogram/projects/activitybook/pages/admin/user/tag_list/`
- 分组管理页：`miniprogram/projects/activitybook/pages/admin/user/group_list/`

## 技术栈

- 前端：微信原生小程序（自定义组件、分包、canvas 海报、wxcharts 图表、RecorderManager 录音、地图选点）。
- 后端：微信云开发（云函数、云数据库、云存储、订阅消息、小程序码）。
- 云函数框架：CCMiniCloud Framework（MVC：Controller / Service / Model）。
- Excel 导出：node-xlsx。

## 目录结构

```
.
├── cloudfunctions/mcloud/        # 云函数
│   ├── framework/                # 基础框架（数据库、云能力、工具、导出）
│   └── project/activitybook/     # 读书会业务
│       ├── controller/           # 控制器（含 admin 后台、my 用户中心）
│       ├── service/              # 业务逻辑（含 admin 后台）
│       ├── model/                # 数据模型
│       └── public/route.js       # 路由配置
├── miniprogram/                  # 小程序前端
│   ├── cmpts/public/             # 公共组件（表单、海报、上传、图表等）
│   ├── projects/activitybook/    # 读书会页面与业务
│   └── helper/                   # 前端工具库
└── demo/                         # 截图与演示二维码
```

## 演示

![输入图片说明](demo/qr.png)

## 安装

- 安装手册见源码包里的 word 文档。
- 使用前请在微信公众平台配置订阅消息模板（活动名称 thing1、审核结果 phrase2、理由 thing3），并将模板 ID 填入 `cloudfunctions/mcloud/config/config.js` 的 `ACTIVITY_SUBSCRIBE_TEMPLATE_ID`。
