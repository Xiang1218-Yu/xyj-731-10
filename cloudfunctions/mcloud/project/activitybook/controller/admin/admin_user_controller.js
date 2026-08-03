/**
 * Notes: 用户控制模块
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2022-01-22 10:20:00 
 */

const BaseProjectAdminController = require('./base_project_admin_controller.js');

const UserModel = require('../../model/user_model.js');
const AdminUserService = require('../../service/admin/admin_user_service.js');
const timeUtil = require('../../../../framework/utils/time_util.js');

class AdminUserController extends BaseProjectAdminController {


	/** 用户信息 */
	async getUserDetail() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			id: 'must|id',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminUserService();
		let user = await service.getUser({
			userId: input.id
		});

		if (user) {
			// 显示转换  
			user.USER_ADD_TIME = timeUtil.timestamp2Time(user.USER_ADD_TIME);
			user.USER_LOGIN_TIME = user.USER_LOGIN_TIME ? timeUtil.timestamp2Time(user.USER_LOGIN_TIME) : '未登录';
		}

		return user;
	}


	/** 用户列表 */
	async getUserList() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			search: 'string|min:1|max:30|name=搜索条件',
			sortType: 'string|name=搜索类型',
			sortVal: 'name=搜索类型值',
			orderBy: 'object|name=排序',
			whereEx: 'object|name=附加查询条件',
			page: 'must|int|default=1',
			size: 'int',
			isTotal: 'bool',
			oldTotal: 'int',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminUserService();
		let result = await service.getUserList(input);

		// 数据格式化
		let list = result.list;
		for (let k = 0; k < list.length; k++) {
			list[k].USER_STATUS_DESC = UserModel.getDesc('STATUS', list[k].USER_STATUS);
			list[k].USER_ADD_TIME = timeUtil.timestamp2Time(list[k].USER_ADD_TIME);
			list[k].USER_LOGIN_TIME = list[k].USER_LOGIN_TIME ? timeUtil.timestamp2Time(list[k].USER_LOGIN_TIME) : '未登录';

		}
		result.list = list;
		return result;
	}

	/** 删除用户 */
	async delUser() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			id: 'must|id',
		};

		// 取得数据
		let input = this.validateData(rules);

		let title = await UserModel.getOneField({ USER_MINI_OPENID: input.id }, 'USER_NAME');

		let service = new AdminUserService();
		await service.delUser(input.id);

		if (title)
			this.logUser('删除了用户「' + title + '」');

	}

	async statusUser() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			id: 'must|id',
			status: 'must|int',
			reason: 'string'
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminUserService();
		await service.statusUser(input.id, input.status, input.reason);
	}

	/************** 用户数据导出 BEGIN ********************* */
	/** 当前是否有导出文件生成 */
	async userDataGet() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			isDel: 'int|must', //是否删除已有记录
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminUserService();

		if (input.isDel === 1)
			await service.deleteUserDataExcel(); //先删除 

		return await service.getUserDataURL();
	}

	/** 导出数据 */
	async userDataExport() {
		await this.isAdmin();

		// 数据校验
		let rules = {
			condition: 'string|name=导出条件',
			fields: 'array',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminUserService();
		return await service.exportUserDataExcel(input.condition, input.fields);
	}

	/** 删除导出的用户数据 */
	async userDataDel() {
		await this.isAdmin();

		// 数据校验
		let rules = {};

		// 取得数据
		let input = this.validateData(rules);

		let service = new AdminUserService();
		return await service.deleteUserDataExcel();
	}

	//######################## 标签 ########################
	/** 标签列表 */
	async userTagList() {
		await this.isAdmin();
		let service = new AdminUserService();
		return await service.getUserTagList();
	}

	/** 保存标签 */
	async userTagSave() {
		await this.isAdmin();
		let rules = {
			id: 'id',
			title: 'must|string|min:1|max:20|name=标签名称',
			color: 'string|name=颜色',
			order: 'int|name=排序'
		};
		let input = this.validateData(rules);
		let service = new AdminUserService();
		let result = await service.saveUserTag(input);
		this.logOther((input.id ? '编辑' : '新增') + '了用户标签《' + input.title + '》');
		return result;
	}

	/** 删除标签 */
	async userTagDel() {
		await this.isAdmin();
		let rules = { id: 'must|id' };
		let input = this.validateData(rules);
		let service = new AdminUserService();
		await service.delUserTag(input.id);
		this.logOther('删除了用户标签');
	}

	//######################## 分组 ########################
	/** 分组列表 */
	async userGroupList() {
		await this.isAdmin();
		let service = new AdminUserService();
		return await service.getUserGroupList();
	}

	/** 保存分组 */
	async userGroupSave() {
		await this.isAdmin();
		let rules = {
			id: 'id',
			title: 'must|string|min:1|max:20|name=分组名称',
			order: 'int|name=排序'
		};
		let input = this.validateData(rules);
		let service = new AdminUserService();
		let result = await service.saveUserGroup(input);
		this.logOther((input.id ? '编辑' : '新增') + '了用户分组《' + input.title + '》');
		return result;
	}

	/** 删除分组 */
	async userGroupDel() {
		await this.isAdmin();
		let rules = { id: 'must|id' };
		let input = this.validateData(rules);
		let service = new AdminUserService();
		await service.delUserGroup(input.id);
		this.logOther('删除了用户分组');
	}

	/** 设置用户标签 */
	async userSetTags() {
		await this.isAdmin();
		let rules = {
			userId: 'must|string|name=用户',
			tags: 'must|array|name=标签'
		};
		let input = this.validateData(rules);
		let service = new AdminUserService();
		return await service.setUserTags(input.userId, input.tags);
	}

	/** 设置用户分组 */
	async userSetGroup() {
		await this.isAdmin();
		let rules = {
			userId: 'must|string|name=用户',
			groupId: 'string|name=分组'
		};
		let input = this.validateData(rules);
		let service = new AdminUserService();
		return await service.setUserGroup(input.userId, input.groupId);
	}

	//######################## 批量操作 ########################
	/** 批量设置标签 */
	async userBatchSetTags() {
		await this.isAdmin();
		let rules = {
			userIds: 'must|array|name=用户',
			tags: 'must|array|name=标签',
			mode: 'string|default=add|name=模式'
		};
		let input = this.validateData(rules);
		let service = new AdminUserService();
		await service.batchSetUserTags(input.userIds, input.tags, input.mode);
		this.logOther('批量设置了用户标签（共' + input.userIds.length + '人）');
	}

	/** 批量设置分组 */
	async userBatchSetGroup() {
		await this.isAdmin();
		let rules = {
			userIds: 'must|array|name=用户',
			groupId: 'string|name=分组'
		};
		let input = this.validateData(rules);
		let service = new AdminUserService();
		await service.batchSetUserGroup(input.userIds, input.groupId);
		this.logOther('批量设置了用户分组（共' + input.userIds.length + '人）');
	}

	/** 批量修改用户状态 */
	async userBatchStatus() {
		await this.isAdmin();
		let rules = {
			userIds: 'must|array|name=用户',
			status: 'must|int|name=状态',
			reason: 'string|name=理由'
		};
		let input = this.validateData(rules);
		let service = new AdminUserService();
		await service.batchStatusUser(input.userIds, input.status, input.reason);
		this.logOther('批量修改了用户状态（共' + input.userIds.length + '人）');
	}

	/** 批量删除用户 */
	async userBatchDel() {
		await this.isAdmin();
		let rules = {
			userIds: 'must|array|name=用户'
		};
		let input = this.validateData(rules);
		let service = new AdminUserService();
		await service.batchDelUser(input.userIds);
		this.logOther('批量删除了用户（共' + input.userIds.length + '人）');
	}
}

module.exports = AdminUserController;