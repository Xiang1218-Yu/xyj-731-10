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

// 导出用户字段配置
const EXPORT_USER_FIELDS = {
	USER_NAME: { title: '昵称', wch: 20 },
	USER_MOBILE: { title: '联系电话', wch: 15 },
	USER_STATUS: { title: '状态', wch: 12, fmt: (v) => UserModel.getDesc('STATUS', v) },
	USER_TAGS: { title: '标签', wch: 25, fmt: (v) => Array.isArray(v) ? v.join('、') : '' },
	USER_GROUP: { title: '分组', wch: 15 },
	USER_MEMO: { title: '管理员备注', wch: 30 },
	USER_LOGIN_CNT: { title: '登录次数', wch: 10 },
	USER_LOGIN_TIME: { title: '最近登录时间', wch: 20, fmt: (v) => v ? timeUtil.timestamp2Time(v) : '未登录' },
	USER_ADD_TIME: { title: '注册时间', wch: 20, fmt: (v) => timeUtil.timestamp2Time(v) },
};

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
		tag, // 标签筛选
		group, // 分组筛选
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

		// 标签筛选
		if (tag) {
			where.and.USER_TAGS = tag;
		}

		// 分组筛选
		if (group) {
			where.and.USER_GROUP = group;
		}

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

	/**修改用户状态 */
	async statusUser(id, status, reason) {
		let data = {
			USER_STATUS: Number(status)
		};
		if (util.isDefined(reason)) data.USER_CHECK_REASON = reason;
		await UserModel.edit({ USER_MINI_OPENID: id }, data);
	}

	/**删除用户 */
	async delUser(id) {
		await UserModel.del({ USER_MINI_OPENID: id });
	}

	/**设置用户标签 */
	async setUserTags(userId, tags) {
		// 确保tags是数组（允许空数组用于清空标签）
		if (!Array.isArray(tags)) tags = [];
		// 过滤空值并去重
		tags = tags.filter(t => t && String(t).trim()).map(t => String(t).trim());
		// 去重
		tags = [...new Set(tags)];
		await UserModel.edit({ USER_MINI_OPENID: userId }, { USER_TAGS: tags });
	}

	/**设置用户分组 */
	async setUserGroup(userId, group) {
		await UserModel.edit({ USER_MINI_OPENID: userId }, { USER_GROUP: group || '' });
	}

	/**设置管理员备注 */
	async setUserMemo(userId, memo) {
		await UserModel.edit({ USER_MINI_OPENID: userId }, { USER_MEMO: memo || '' });
	}

	/**批量修改用户状态 */
	async batchStatusUser(ids, status) {
		if (!Array.isArray(ids) || ids.length == 0) return;
		await UserModel.edit({ USER_MINI_OPENID: ['in', ids] }, { USER_STATUS: Number(status) });
	}

	/**批量删除用户 */
	async batchDelUser(ids) {
		if (!Array.isArray(ids) || ids.length == 0) return;
		await UserModel.del({ USER_MINI_OPENID: ['in', ids] });
	}

	/**批量设置用户标签 mode='add'/'remove'/'set' */
	async batchSetUserTags(ids, tags, mode = 'set') {
		if (!Array.isArray(ids) || ids.length == 0) return;
		if (!Array.isArray(tags)) tags = [];

		// 直接覆盖
		if (mode === 'set') {
			await UserModel.edit({ USER_MINI_OPENID: ['in', ids] }, { USER_TAGS: tags });
			return;
		}

		// 追加/移除 需要先取出当前标签再合并
		let users = await UserModel.getAllBig({ USER_MINI_OPENID: ['in', ids] }, 'USER_MINI_OPENID,USER_TAGS');
		for (let k = 0; k < users.length; k++) {
			let curTags = Array.isArray(users[k].USER_TAGS) ? users[k].USER_TAGS.slice() : [];

			if (mode === 'add') {
				for (let j = 0; j < tags.length; j++) {
					if (curTags.indexOf(tags[j]) === -1) curTags.push(tags[j]);
				}
			} else if (mode === 'remove') {
				for (let j = 0; j < tags.length; j++) {
					let idx = curTags.indexOf(tags[j]);
					if (idx > -1) curTags.splice(idx, 1);
				}
			}

			await UserModel.edit({ USER_MINI_OPENID: users[k].USER_MINI_OPENID }, { USER_TAGS: curTags });
		}
	}

	/**获取所有标签列表（从所有用户中聚合提取） */
	async getUserTagList() {
		let list = await UserModel.getAllBig({}, 'USER_TAGS', { USER_ADD_TIME: 'desc' });

		let tagMap = {};
		for (let k = 0; k < list.length; k++) {
			let tags = list[k].USER_TAGS;
			if (!Array.isArray(tags)) continue;

			for (let j = 0; j < tags.length; j++) {
				let tag = tags[j];
				if (tag === null || tag === undefined || tag === '') continue;

				if (!tagMap[tag]) tagMap[tag] = { tag, total: 0 };
				tagMap[tag].total++;
			}
		}

		let ret = Object.values(tagMap);
		ret.sort((a, b) => b.total - a.total);
		return ret;
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

		let where = {};
		if (condition) {
			try {
				where = JSON.parse(decodeURIComponent(condition));
			} catch (e) {
				where = {};
			}
		}
		if (!where.and) where.and = {};
		where.and._pid = this.getProjectId();

		let list = await UserModel.getAllBig(where, '*', { USER_ADD_TIME: 'desc' });

		// 确定导出字段
		let exportFields = [];
		if (Array.isArray(fields) && fields.length > 0) {
			for (let k = 0; k < fields.length; k++) {
				if (EXPORT_USER_FIELDS[fields[k]]) exportFields.push(fields[k]);
			}
		}
		if (exportFields.length == 0) {
			exportFields = Object.keys(EXPORT_USER_FIELDS);
		}

		// 表头与列宽
		let head = [];
		let colWidths = [];
		for (let k = 0; k < exportFields.length; k++) {
			let conf = EXPORT_USER_FIELDS[exportFields[k]];
			head.push(conf.title);
			colWidths.push({ wch: conf.wch || 20 });
		}

		let data = [head];
		for (let i = 0; i < list.length; i++) {
			let row = [];
			for (let k = 0; k < exportFields.length; k++) {
				let key = exportFields[k];
				let conf = EXPORT_USER_FIELDS[key];
				let val = list[i][key];
				if (conf.fmt) val = conf.fmt(val, list[i]);
				row.push(val);
			}
			data.push(row);
		}

		let options = { '!cols': colWidths };

		return await exportUtil.exportDataExcel(EXPORT_USER_DATA_KEY, '用户数据', list.length, data, options);
	}

}

module.exports = AdminUserService;