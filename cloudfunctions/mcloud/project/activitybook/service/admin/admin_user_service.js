/**
 * Notes: 用户管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2022-01-22  07:48:00 
 */

const BaseProjectAdminService = require('./base_project_admin_service.js');

const util = require('../../../../framework/utils/util.js');
const exportUtil = require('../../../../framework/utils/export_util.js');
const timeUtil = require('../../../../framework/utils/time_util.js');
const dataUtil = require('../../../../framework/utils/data_util.js');
const UserModel = require('../../model/user_model.js');
const UserTagModel = require('../../model/user_tag_model.js');
const UserGroupModel = require('../../model/user_group_model.js');
const AdminHomeService = require('./admin_home_service.js');

// 导出用户数据KEY
const EXPORT_USER_DATA_KEY = 'EXPORT_USER_DATA';

class AdminUserService extends BaseProjectAdminService {


	/** 获得某个用户信息 */
	async getUser({
		userId,
		fields = '*'
	}) {
		let where = {
			USER_MINI_OPENID: userId,
		}
		return await UserModel.getOne(where, fields);
	}

	/** 取得用户分页列表 */
	async getUserList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		whereEx, //附加查询条件 
		page,
		size,
		oldTotal = 0
	}) {

		orderBy = orderBy || {
			USER_ADD_TIME: 'desc'
		};
		let fields = '*';


		let where = {};
		where.and = {
			_pid: this.getProjectId() //复杂的查询在此处标注PID
		};

		if (util.isDefined(search) && search) {
			where.or = [{
				USER_NAME: ['like', search]
			},
			{
				USER_MOBILE: ['like', search]
			},
			{
				USER_MEMO: ['like', search]
			},
			];

		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'status':
					where.and.USER_STATUS = Number(sortVal);
					break; 
				case 'group':
					where.and.USER_GROUP = String(sortVal);
					break;
				case 'tag':
					where.and.USER_TAGS = ['in', [String(sortVal)]];
					break;
				case 'sort': {
					orderBy = this.fmtOrderBySort(sortVal, 'USER_ADD_TIME');
					break;
					}
			}
		}
		let result = await UserModel.getList(where, fields, orderBy, page, size, true, oldTotal, false);


		// 为导出增加一个参数condition
		result.condition = encodeURIComponent(JSON.stringify(where));

		return result;
	}

	/** 修改用户状态 */
	async statusUser(id, status, reason) {
		status = Number(status);

		let data = {
			USER_STATUS: status
		};

		if (status == UserModel.STATUS.UNCHECK) {
			data.USER_CHECK_REASON = reason || '';
		} else {
			data.USER_CHECK_REASON = '';
		}

		let where = {
			USER_MINI_OPENID: id
		};
		await UserModel.edit(where, data);
	}

	/**删除用户 */
	async delUser(id) {
		let where = {
			USER_MINI_OPENID: id
		};
		return await UserModel.del(where);
	}

	// #####################导出用户数据

	/**获取用户数据 */
	async getUserDataURL() {
		return await exportUtil.getExportDataURL(EXPORT_USER_DATA_KEY);
	}

	/**删除用户数据 */
	async deleteUserDataExcel() {
		return await exportUtil.deleteDataExcel(EXPORT_USER_DATA_KEY);
	}

	/**导出用户数据 */
	async exportUserDataExcel(condition, fields) {
		// 解析查询条件
		let where = {};
		if (condition) {
			try {
				where = JSON.parse(decodeURIComponent(condition));
			} catch (e) {
				where = {};
			}
		}

		if (!fields || !Array.isArray(fields) || fields.length == 0) {
			fields = ['USER_MINI_OPENID', 'USER_NAME', 'USER_MOBILE', 'USER_STATUS', 'USER_ADD_TIME'];
		}

		// 取出全部用户
		let orderBy = { USER_ADD_TIME: 'desc' };
		let list = await UserModel.getAllBig(where, fields.join(','), orderBy, 10000);

		// 表头
		let title = [];
		for (let k = 0; k < fields.length; k++) {
			title.push({ column: fields[k], wch: 20 });
		}

		let data = [];
		data.push(title.map(t => t.column));

		for (let k = 0; k < list.length; k++) {
			let node = list[k];
			let row = [];
			for (let j = 0; j < fields.length; j++) {
				let key = fields[j];
				let val = node[key];

				// 特殊字段格式化
				if (key == 'USER_STATUS') {
					val = UserModel.getDesc('STATUS', Number(val));
				} else if (key == 'USER_ADD_TIME' || key == 'USER_EDIT_TIME' || key == 'USER_LOGIN_TIME') {
					val = val ? timeUtil.timestamp2Time(val) : '';
				} else if (Array.isArray(val)) {
					val = val.join(',');
				} else if (val === null || val === undefined) {
					val = '';
				}
				row.push(val);
			}
			data.push(row);
		}

		let total = data.length - 1;
		let options = { '!cols': title.map(t => ({ wch: t.wch })) };

		return await exportUtil.exportDataExcel(
			EXPORT_USER_DATA_KEY,
			'用户数据',
			total,
			data,
			options
		);
	}

	// #####################用户标签

	/** 获取标签列表 */
	async getUserTagList() {
		let where = {};
		let orderBy = {
			USER_TAG_ORDER: 'asc',
			USER_TAG_ADD_TIME: 'desc'
		};
		return await UserTagModel.getAllBig(where, '*', orderBy, 1000);
	}

	/** 重新统计所有标签的使用人数 */
	async _statUserTagCnt() {
		let tags = await UserTagModel.getAllBig({}, 'USER_TAG_ID', {}, 1000);
		for (let k = 0; k < tags.length; k++) {
			let tagId = tags[k].USER_TAG_ID;
			let cnt = await UserModel.count({ USER_TAGS: ['in', [tagId]] });
			await UserTagModel.edit({ USER_TAG_ID: tagId }, { USER_TAG_CNT: cnt });
		}
	}

	/** 新增/编辑标签 */
	async saveUserTag({ id, title, color, order }) {
		let data = {
			USER_TAG_TITLE: title,
			USER_TAG_COLOR: color || '#19b6ee',
			USER_TAG_ORDER: Number(order) || 9999
		};

		let tagId;
		if (id) {
			// 编辑
			let where = { USER_TAG_ID: id };
			let old = await UserTagModel.getOne(where, 'USER_TAG_ID');
			if (!old) this.AppError('标签不存在');

			await UserTagModel.edit(where, data);
			tagId = id;
		} else {
			// 新增
			tagId = await UserTagModel.insert(data);
		}

		// 重新统计标签使用人数
		await this._statUserTagCnt();

		return { id: tagId };
	}

	/** 删除标签（同时清除用户身上的该标签） */
	async delUserTag(id) {
		let where = { USER_TAG_ID: id };
		let tag = await UserTagModel.getOne(where, 'USER_TAG_ID');
		if (!tag) return;

		// 删除标签
		await UserTagModel.del(where);

		// 清除用户身上的该标签
		let userList = await UserModel.getAllBig({ USER_TAGS: ['in', [id]] }, 'USER_MINI_OPENID,USER_TAGS', {}, 10000);
		for (let k = 0; k < userList.length; k++) {
			let tags = userList[k].USER_TAGS || [];
			let newTags = tags.filter(t => t !== id);
			await UserModel.edit({ USER_MINI_OPENID: userList[k].USER_MINI_OPENID }, { USER_TAGS: newTags });
		}
	}

	// #####################用户分组

	/** 获取分组列表 */
	async getUserGroupList() {
		let where = {};
		let orderBy = {
			USER_GROUP_ORDER: 'asc',
			USER_GROUP_ADD_TIME: 'desc'
		};
		return await UserGroupModel.getAllBig(where, '*', orderBy, 1000);
	}

	/** 重新统计所有分组的人数 */
	async _statUserGroupCnt() {
		let groups = await UserGroupModel.getAllBig({}, 'USER_GROUP_ID', {}, 1000);
		for (let k = 0; k < groups.length; k++) {
			let groupId = groups[k].USER_GROUP_ID;
			let cnt = await UserModel.count({ USER_GROUP: groupId });
			await UserGroupModel.edit({ USER_GROUP_ID: groupId }, { USER_GROUP_CNT: cnt });
		}
	}

	/** 新增/编辑分组 */
	async saveUserGroup({ id, title, order }) {
		let data = {
			USER_GROUP_TITLE: title,
			USER_GROUP_ORDER: Number(order) || 9999
		};

		let groupId;
		if (id) {
			// 编辑
			let where = { USER_GROUP_ID: id };
			let old = await UserGroupModel.getOne(where, 'USER_GROUP_ID');
			if (!old) this.AppError('分组不存在');

			await UserGroupModel.edit(where, data);
			groupId = id;
		} else {
			// 新增
			groupId = await UserGroupModel.insert(data);
		}

		// 重新统计分组人数
		await this._statUserGroupCnt();

		return { id: groupId };
	}

	/** 删除分组 */
	async delUserGroup(id) {
		let where = { USER_GROUP_ID: id };
		let group = await UserGroupModel.getOne(where, 'USER_GROUP_ID');
		if (!group) return;

		// 删除分组
		await UserGroupModel.del(where);

		// 清除用户身上的该分组
		await UserModel.edit({ USER_GROUP: id }, { USER_GROUP: '' });
	}

	// #####################单个用户标签/分组设置

	/** 设置用户标签数组（覆盖） */
	async setUserTags(userId, tags) {
		if (!Array.isArray(tags)) tags = [];
		let where = { USER_MINI_OPENID: userId };
		await UserModel.edit(where, { USER_TAGS: tags });

		// 重新统计标签使用人数
		await this._statUserTagCnt();
	}

	/** 设置用户分组 */
	async setUserGroup(userId, groupId) {
		let where = { USER_MINI_OPENID: userId };
		await UserModel.edit(where, { USER_GROUP: groupId || '' });

		// 重新统计分组人数
		await this._statUserGroupCnt();
	}

	// #####################批量操作

	/** 批量设置标签 mode=add追加/cover覆盖 */
	async batchSetUserTags(userIds, tags, mode = 'add') {
		if (!Array.isArray(userIds) || userIds.length == 0) return;
		if (!Array.isArray(tags)) tags = [];

		let where = {
			USER_MINI_OPENID: ['in', userIds]
		};

		if (mode == 'cover') {
			// 覆盖：直接设置
			await UserModel.edit(where, { USER_TAGS: tags });
		} else {
			// 追加：先取出用户现有标签，合并去重
			let userList = await UserModel.getAllBig(where, 'USER_MINI_OPENID,USER_TAGS', {}, 10000);
			for (let k = 0; k < userList.length; k++) {
				let oldTags = userList[k].USER_TAGS || [];
				let merged = [...oldTags];
				for (let j = 0; j < tags.length; j++) {
					if (!merged.includes(tags[j])) merged.push(tags[j]);
				}
				await UserModel.edit({ USER_MINI_OPENID: userList[k].USER_MINI_OPENID }, { USER_TAGS: merged });
			}
		}

		// 重新统计标签使用人数
		await this._statUserTagCnt();
	}

	/** 批量设置分组 */
	async batchSetUserGroup(userIds, groupId) {
		if (!Array.isArray(userIds) || userIds.length == 0) return;

		let where = {
			USER_MINI_OPENID: ['in', userIds]
		};
		await UserModel.edit(where, { USER_GROUP: groupId || '' });

		// 重新统计分组人数
		await this._statUserGroupCnt();
	}

	/** 批量修改用户状态 */
	async batchStatusUser(userIds, status, reason) {
		if (!Array.isArray(userIds) || userIds.length == 0) return;
		status = Number(status);

		let data = { USER_STATUS: status };
		if (status == UserModel.STATUS.UNCHECK) {
			data.USER_CHECK_REASON = reason || '';
		} else {
			data.USER_CHECK_REASON = '';
		}

		let where = {
			USER_MINI_OPENID: ['in', userIds]
		};
		await UserModel.edit(where, data);
	}

	/** 批量删除用户 */
	async batchDelUser(userIds) {
		if (!Array.isArray(userIds) || userIds.length == 0) return;

		let where = {
			USER_MINI_OPENID: ['in', userIds]
		};
		return await UserModel.del(where);
	}

}

module.exports = AdminUserService;
