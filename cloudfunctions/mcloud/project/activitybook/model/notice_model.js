/**
 * Notes: 站内通知实体
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2026-08-02 10:00:00 
 */


const BaseProjectModel = require('./base_project_model.js');

class NoticeModel extends BaseProjectModel {

}

// 集合名
NoticeModel.CL = BaseProjectModel.C('notice');

NoticeModel.DB_STRUCTURE = {
	_pid: 'string|true',
	NOTICE_ID: 'string|true',

	NOTICE_USER_ID: 'string|true|comment=接收人用户ID',

	NOTICE_TYPE: 'int|true|default=1|comment=通知类型 1=报名审核结果',
	NOTICE_TITLE: 'string|true|comment=通知标题',
	NOTICE_DESC: 'string|false|comment=通知内容',

	NOTICE_ACTIVITY_ID: 'string|false|comment=关联活动ID',
	NOTICE_JOIN_ID: 'string|false|comment=关联报名记录ID',

	NOTICE_READ: 'int|true|default=0|comment=是否已读 0=未读,1=已读',

	NOTICE_ADD_TIME: 'int|true',
	NOTICE_EDIT_TIME: 'int|true',
	NOTICE_ADD_IP: 'string|false',
	NOTICE_EDIT_IP: 'string|false',
};

// 字段前缀
NoticeModel.FIELD_PREFIX = "NOTICE_";

/**
 * 通知类型 1=报名审核结果
 */
NoticeModel.TYPE = {
	ACTIVITY_JOIN: 1
};

NoticeModel.TYPE_DESC = {
	ACTIVITY_JOIN: '报名审核结果'
};

/**
 * 是否已读 0=未读,1=已读
 */
NoticeModel.READ = {
	UNREAD: 0,
	READ: 1
};

NoticeModel.READ_DESC = {
	UNREAD: '未读',
	READ: '已读'
};


module.exports = NoticeModel;
