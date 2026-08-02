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
				case 'tag': { // 按标签筛选（USER_TAGS为数组，匹配包含该标签的用户）
					if (sortVal) where.and.USER_TAGS = String(sortVal);
					break;
				}
				case 'group': { // 按分组筛选
					if (sortVal) where.and.USER_GROUP = String(sortVal);
					break;
				}
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

	async statusUser(id, status, reason) {
		this.AppError('[书友会]该功能暂不开放，如有需要请加作者微信：cclinux0730');
	}

	/**删除用户 */
	async delUser(id) {
		this.AppError('[书友会]该功能暂不开放，如有需要请加作者微信：cclinux0730');

	}

	/** 批量删除用户（ids为用户小程序openid数组） */
	async batchDelUser(ids) {
		if (!Array.isArray(ids) || !ids.length)
			this.AppError('请选择要操作的用户');

		// 批量删除（用户主键为USER_MINI_OPENID）
		let where = {
			USER_MINI_OPENID: ['in', ids]
		};
		let cnt = await UserModel.del(where);
		return { cnt };
	}

	/** 批量设置用户状态（status：1=启用 9=禁用） */
	async batchStatusUser(ids, status) {
		if (!Array.isArray(ids) || !ids.length)
			this.AppError('请选择要操作的用户');

		status = Number(status);
		if (![UserModel.STATUS.COMM, UserModel.STATUS.FORBID].includes(status))
			this.AppError('状态值不正确');

		// 批量更新状态，同时清空审核理由
		let where = {
			USER_MINI_OPENID: ['in', ids]
		};
		let data = {
			USER_STATUS: status,
			USER_CHECK_REASON: ''
		};
		let cnt = await UserModel.edit(where, data);
		return { cnt };
	}

	/** 设置用户标签（ids支持单个或批量，tags为标签名数组，整体覆盖） */
	async setUserTag(ids, tags) {
		if (!Array.isArray(ids) || !ids.length)
			this.AppError('请选择要操作的用户');
		if (!Array.isArray(tags))
			this.AppError('标签格式不正确');

		// 标签清洗：去空格、去空值、去重，最多10个
		tags = tags.map(item => String(item).trim()).filter(item => item);
		tags = [...new Set(tags)].slice(0, 10);

		let where = {
			USER_MINI_OPENID: ['in', ids]
		};
		let cnt = await UserModel.edit(where, { USER_TAGS: tags });
		return { cnt };
	}

	/** 设置用户分组（ids支持单个或批量，group为分组名，传空字符串表示清除分组） */
	async setUserGroup(ids, group) {
		if (!Array.isArray(ids) || !ids.length)
			this.AppError('请选择要操作的用户');

		group = String(group || '').trim();

		let where = {
			USER_MINI_OPENID: ['in', ids]
		};
		let cnt = await UserModel.edit(where, { USER_GROUP: group });
		return { cnt };
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

		this.AppError('[书友会]该功能暂不开放，如有需要请加作者微信：cclinux0730');

	}

}

module.exports = AdminUserService;