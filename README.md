# 背景

读书会小程序：随着人们生活节奏的加快和信息的爆炸性增长，读书会作为一种集体学习和交流的方式逐渐受到欢迎。为了提高读书会的组织效率和参与度，读书会小程序将成为一个有益的工具。该小程序旨在为读书会提供统一的平台，方便组织者管理活动、参与者报名，并为参与者提供便捷的沟通和学习交流渠道。

# 功能 

- 活动管理：组织者可以轻松创建、编辑和取消读书会活动，管理活动的时间、地点、参与人数等信息。
- 参与报名：用户可以通过小程序浏览并报名参加感兴趣的读书会活动，提供简单而便捷的报名渠道。
- 书单推荐：小程序可以根据用户的阅读兴趣推荐相关书籍，促进读书会的多样化和深度。
- 学习资源分享：读书会成员可以在小程序上分享学习资源、笔记、心得等，推动学习交流和共享精神。
- 阅读打卡

## 新增功能迭代

以下功能基于微信原生开发 + 云开发（CloudBase）实现，均保留了代码注释：

1. **自定义报名表单字段**：组织者在创建/编辑活动时可点击"添加自定义字段"，选择字段类型（文本 / 单选 / 多选 / 数字等），报名者填写时动态渲染对应表单控件，后台可导出包含自定义字段的 Excel 名单。
   - 前端字段构建：`miniprogram/cmpts/public/form/form_set_helper.js`（开放字段类型）、`form_set` 组件
   - 报名者动态渲染：`miniprogram/cmpts/public/form/form_show/`
   - 后台入库与导出：`cloudfunctions/mcloud/project/activitybook/service/admin/admin_activity_service.js`（`insertActivity` / `editActivity` / `exportActivityJoinDataExcel`）

2. **多媒体打卡**：打卡从纯文字扩展为支持 图片 / 语音 / 位置。
   - 新增语音录制组件：`miniprogram/cmpts/public/audio/audio_upload_cmpt.*`
   - 新增位置选择组件：`miniprogram/cmpts/public/location/location_pick_cmpt.*`
   - 表单渲染与校验：`form_show_cmpt` 新增 `audio` / `location` 渲染分支，`form_set_helper` 新增类型
   - 媒体上传：复用 `miniprogram/helper/cloud_helper.js` 的 `transTempPics`（新增 audio 处理）

3. **报名审核状态流转与通知**：组织者可设置报名方式（直接通过 / 需审核）；后台展示待审核列表，支持一键通过 / 拒绝；申请人收到审核结果的订阅消息通知；支持设置人数上限自动截止。
   - 审核与通知：`admin_activity_service.js`（`statusActivityJoin` / `cancelActivityJoinAll` + `mini_lib.sendMiniOnceTempMsg`）
   - 订阅授权：`pages/activity/join/activity_join.js`（`wx.requestSubscribeMessage`）
   - 模板ID配置：云端 `public/constants.js` 与前端 `public/project_setting.js` 的 `SUBSCRIBE_ACTIVITY_JOIN_TMPL_ID`
   - 人数上限与截止：`service/activity_service.js`（报名时校验 `ACTIVITY_MAX_CNT` / `ACTIVITY_STOP`）

4. **"我的"页面可视化数据统计卡片**：展示报名活动数、已签到数、打卡次数、打卡天数、收藏数。
   - 统计聚合：`cloudfunctions/mcloud/project/activitybook/service/my_service.js` + `controller/my_controller.js`（路由 `my/stat`）
   - 卡片渲染：`pages/my/index/my_index.*`

5. **后台批量操作**：用户、书单、活动列表支持多选、全选与批量删除 / 批量状态变更。
   - 后端批量方法：`admin_user_service.js` / `admin_product_service.js` / `admin_activity_service.js`（`batch*` 方法）
   - 前端批量 UI：对应 `pages/admin/{user,product,activity}/list/` 列表页

6. **活动海报生成**：基于活动信息一键生成可分享海报，提供多套模板（经典白 / 深色大图 / 清新简约），支持实时预览、保存到相册与转发。
   - 模板与生成：`miniprogram/cmpts/public/poster/poster_cmpt_helper.js`（`config1/2/3` + `configByTemplate`）
   - 组件与预览：`miniprogram/cmpts/public/poster/poster_cmpt.*`（模板选择实时重绘）
   - 接入示例：`miniprogram/cmpts/biz/detail/detail_cmpt.*`（活动详情页分享）

7. **用户打标签与分组**：后台用户管理支持给用户打标签 / 分组（如"活跃用户""资深书友"），可按标签筛选、批量打标签，导出时包含标签列。
   - 数据字段：`model/user_model.js` 新增 `USER_TAGS`
   - 标签与筛选：`admin_user_service.js`（`setUserTags` / `batchAddUserTag` / 按 `tag` 筛选）
   - 前端展示与操作：`pages/admin/user/list/`
 
## 演示 
 ![输入图片说明](demo/qr.png)

## 安装

- 安装手册见源码包里的word文档 

 