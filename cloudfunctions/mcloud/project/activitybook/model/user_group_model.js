/**
 * Notes: 用户分组实体
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2024-01-01 19:20:00 
 */


const BaseProjectModel = require('./base_project_model.js');

class UserGroupModel extends BaseProjectModel {

}

// 集合名
UserGroupModel.CL = BaseProjectModel.C('user_group');

UserGroupModel.DB_STRUCTURE = {
	_pid: 'string|true',
	USER_GROUP_ID: 'string|true',

	USER_GROUP_TITLE: 'string|true|comment=分组名称',
	USER_GROUP_ORDER: 'int|true|default=9999|comment=排序',
	USER_GROUP_CNT: 'int|true|default=0|comment=分组人数',

	USER_GROUP_ADD_TIME: 'int|true',
	USER_GROUP_EDIT_TIME: 'int|true',
	USER_GROUP_ADD_IP: 'string|false',
	USER_GROUP_EDIT_IP: 'string|false',
};

// 字段前缀
UserGroupModel.FIELD_PREFIX = "USER_GROUP_";

module.exports = UserGroupModel;
