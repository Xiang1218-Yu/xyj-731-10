/**
 * Notes: 用户标签实体
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2024-01-01 19:20:00 
 */


const BaseProjectModel = require('./base_project_model.js');

class UserTagModel extends BaseProjectModel {

}

// 集合名
UserTagModel.CL = BaseProjectModel.C('user_tag');

UserTagModel.DB_STRUCTURE = {
	_pid: 'string|true',
	USER_TAG_ID: 'string|true',

	USER_TAG_TITLE: 'string|true|comment=标签名称',
	USER_TAG_COLOR: 'string|true|default=#19b6ee|comment=标签颜色',
	USER_TAG_ORDER: 'int|true|default=9999|comment=排序',
	USER_TAG_CNT: 'int|true|default=0|comment=使用人数',

	USER_TAG_ADD_TIME: 'int|true',
	USER_TAG_EDIT_TIME: 'int|true',
	USER_TAG_ADD_IP: 'string|false',
	USER_TAG_EDIT_IP: 'string|false',
};

// 字段前缀
UserTagModel.FIELD_PREFIX = "USER_TAG_";

module.exports = UserTagModel;
