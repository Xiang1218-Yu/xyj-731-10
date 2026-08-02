# 背景

读书会小程序：随着人们生活节奏的加快和信息的爆炸性增长，读书会作为一种集体学习和交流的方式逐渐受到欢迎。为了提高读书会的组织效率和参与度，读书会小程序将成为一个有益的工具。该小程序旨在为读书会提供统一的平台，方便组织者管理活动、参与者报名，并为参与者提供便捷的沟通和学习交流渠道。

技术栈：微信原生小程序 + 微信云开发（云函数 mcloud，CCMiniCloud 框架）。

# 功能 

- 活动管理：组织者可以轻松创建、编辑和取消读书会活动，管理活动的时间、地点、参与人数等信息。
- 参与报名：用户可以通过小程序浏览并报名参加感兴趣的读书会活动，提供简单而便捷的报名渠道。
- 书单推荐：小程序可以根据用户的阅读兴趣推荐相关书籍，促进读书会的多样化和深度。
- 学习资源分享：读书会成员可以在小程序上分享学习资源、笔记、心得等，推动学习交流和共享精神。
- 阅读打卡

# 本轮迭代新增功能

## 1. 活动自定义报名表单字段
- 组织者在后台创建/编辑活动时，可点击"添加自定义字段"扩展报名表单（如是否需要带书、饮食忌口等）。
- 字段类型支持：文本（text）、单选（radio）、多选（checkbox）、数字（number），可配置字段名、是否必填、选项值。
- 报名者报名时由 form_show 组件根据 `ACTIVITY_JOIN_FORMS` 动态渲染表单并校验必填项。
- 后台报名名单导出 Excel 时自动包含自定义字段列（多选值逗号拼接）。
- 关键代码：`cloudfunctions/mcloud/project/activitybook/service/admin/admin_activity_service.js`、`miniprogram/cmpts/public/form/form_set/`、`miniprogram/cmpts/public/form/form_show/`。

## 2. 多媒体打卡（图片 / 语音 / 位置）
- 打卡从纯文字扩展为支持：多图上传（云存储）、语音录制（`wx.getRecorderManager`，限 60 秒，可试听）、位置打卡（`wx.chooseLocation`，保存地址与经纬度）。
- 打卡动态列表、打卡详情、我的打卡记录均支持图片预览、语音播放/暂停（`wx.createInnerAudioContext`）、位置展示。
- 关键代码：`miniprogram/projects/activitybook/pages/enroll/do/enroll_do.js`、`cloudfunctions/mcloud/project/activitybook/model/enroll_join_model.js`（新增 `ENROLL_JOIN_IMG / ENROLL_JOIN_VOICE / ENROLL_JOIN_ADDRESS / ENROLL_JOIN_ADDRESS_GEO`）。

## 3. 报名审核状态流转与通知
- 组织者可设置报名方式（直接通过 / 需审核，`ACTIVITY_CHECK_SET`）与人数上限（`ACTIVITY_MAX_CNT`，0 为不限；达到上限自动截止，报名按钮置灰提示"名额已满"）。
- 后台报名名单页提供"待审核"筛选，显示申请人信息及自定义字段，支持单个/批量"通过""拒绝"（拒绝可填理由）。
- 审核结果通过订阅消息通知申请人（模板 ID 配置于 `project_config.js` / `project_setting.js` 的 `ACTIVITY_JOIN_NOTICE_TID`，未配置则静默跳过）；用户端"我的报名"列表/详情展示待审核 / 成功（含核验码）/ 未通过（含理由）状态。
- 关键代码：`cloudfunctions/mcloud/project/activitybook/service/admin/admin_activity_service.js`（`statusActivityJoin`、`sendActivityJoinNotice`）、`miniprogram/projects/activitybook/pages/admin/activity/join_list/`。

## 4. "我的"页面可视化数据统计卡片
- 我的页面新增"我的数据统计"卡片：报名次数、参与次数、打卡次数、打卡天数、收藏数等关键指标。
- 使用 wxcharts 渲染近 7 天打卡次数柱状图；未登录用户显示登录引导。
- 关键代码：`miniprogram/projects/activitybook/pages/my/index/my_index.js`、`cloudfunctions/mcloud/project/activitybook/service/my_service.js`（`getMyDataStat`）。

## 5. 后台批量操作
- 用户列表：批量删除、批量启用/禁用、批量打标签。
- 书单列表：批量删除、批量上下架。
- 活动列表：批量删除（同步清理报名记录）、批量启用/停用。
- 活动报名名单：批量通过、批量拒绝（统一理由）、批量删除，操作后自动重算报名人数。
- 关键代码：`cloudfunctions/mcloud/project/activitybook/controller/admin/` 下各 admin controller 的 `batch*` 接口、`miniprogram/projects/activitybook/pages/admin/` 下各 list 页面。

## 6. 活动海报一键生成
- 活动详情页新增"生成海报"入口，进入海报页后基于活动信息（标题、时间、地点、名额、小程序码）一键生成可分享的活动海报图片。
- 提供 3 套海报模版（明亮黄 / 墨绿 / 藏青），切换模版实时预览重绘。
- 支持保存到相册（授权被拒时引导开启）；封面云图片自动转临时链接绘制。
- 关键代码：`miniprogram/projects/activitybook/pages/activity/poster/activity_poster.js`。

## 7. 用户标签与分组
- 后台用户管理支持给用户打标签（预置"活跃用户""资深书友""新用户"等 + 自定义标签）和设置分组。
- 用户列表支持按标签 / 分组筛选，列表项与详情页展示彩色标签；支持批量打标签。
- 关键代码：`cloudfunctions/mcloud/project/activitybook/model/user_model.js`（`USER_TAGS / USER_GROUP`）、`miniprogram/projects/activitybook/pages/admin/user/list/admin_user_list.js`。

## 演示 
 ![输入图片说明](demo/qr.png)

## 安装

- 安装手册见源码包里的word文档 
