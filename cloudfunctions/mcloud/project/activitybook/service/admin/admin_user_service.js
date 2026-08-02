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
				case 'tag':
					// 按标签/分组筛选
					where.and.USER_TAGS = sortVal;
					break;
				case 'sort': {
					orderBy = this.fmtOrderBySort(sortVal, 'USER_ADD_TIME');
					break;
					}
			}
		}

		// 附加查询条件 (如按标签精确筛选)
		if (util.isDefined(whereEx) && whereEx) {
			for (let key in whereEx) {
				where.and[key] = whereEx[key];
			}
		}

		let result = await UserModel.getList(where, fields, orderBy, page, size, true, oldTotal, false);


		// 为导出增加一个参数condition
		result.condition = encodeURIComponent(JSON.stringify(where));

		return result;
	}

	/**修改用户状态 */
	async statusUser(id, status, reason) {
		status = Number(status);
		let data = {
			USER_STATUS: status,
			USER_CHECK_REASON: reason || ''
		};
		await UserModel.edit({ USER_MINI_OPENID: id }, data);
	}

	/**删除用户 */
	async delUser(id) {
		await UserModel.del({ USER_MINI_OPENID: id });
	}

	//##################### 批量操作 (后台管理)

	/** 批量修改用户状态 */
	async batchStatusUser(ids, status) {
		if (!ids || ids.length == 0) return;
		status = Number(status);
		await UserModel.edit({ USER_MINI_OPENID: ['in', ids] }, { USER_STATUS: status });
	}

	/** 批量删除用户 */
	async batchDelUser(ids) {
		if (!ids || ids.length == 0) return;
		await UserModel.del({ USER_MINI_OPENID: ['in', ids] });
	}

	//##################### 用户标签/分组

	/** 设置单个用户的标签/分组 */
	async setUserTags(id, tags) {
		if (!Array.isArray(tags)) tags = [];
		await UserModel.edit({ USER_MINI_OPENID: id }, { USER_TAGS: tags });
	}

	/** 批量给用户追加标签(去重) */
	async batchAddUserTag(ids, tag) {
		if (!ids || ids.length == 0 || !tag) return;

		let list = await UserModel.getAll({ USER_MINI_OPENID: ['in', ids] }, 'USER_MINI_OPENID,USER_TAGS', {}, 1000);
		for (let k = 0; k < list.length; k++) {
			let tags = list[k].USER_TAGS || [];
			if (!tags.includes(tag)) {
				tags.push(tag);
				await UserModel.edit({ USER_MINI_OPENID: list[k].USER_MINI_OPENID }, { USER_TAGS: tags });
			}
		}
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

	/**导出用户数据 (含标签/分组) */
	async exportUserDataExcel(condition, fields) {
		// condition 为列表查询时生成的where条件(已encodeURIComponent)
		let where = {};
		if (condition) {
			try {
				where = JSON.parse(decodeURIComponent(condition));
			} catch (e) {
				where = { and: { _pid: this.getProjectId() } };
			}
		}

		let orderBy = { USER_ADD_TIME: 'desc' };
		let list = await UserModel.getAll(where, 'USER_NAME,USER_MOBILE,USER_STATUS,USER_TAGS,USER_ADD_TIME', orderBy, 5000);

		let header = ['昵称', '手机', '状态', '标签/分组', '注册时间'];
		let data = [header];
		for (let k = 0; k < list.length; k++) {
			let u = list[k];
			data.push([
				u.USER_NAME || '',
				u.USER_MOBILE || '',
				UserModel.getDesc('STATUS', u.USER_STATUS),
				(u.USER_TAGS && u.USER_TAGS.length) ? u.USER_TAGS.join('、') : '',
				timeUtil.timestamp2Time(u.USER_ADD_TIME)
			]);
		}

		return await exportUtil.exportDataExcel(EXPORT_USER_DATA_KEY, '用户资料', list.length, data);
	}

}

module.exports = AdminUserService;