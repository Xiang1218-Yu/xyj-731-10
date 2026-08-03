/**
 * Notes: 活动后台管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2022-06-23 07:48:00 
 */

const BaseProjectAdminService = require('./base_project_admin_service.js');
const ActivityService = require('../activity_service.js');
const AdminHomeService = require('../admin/admin_home_service.js');
const util = require('../../../../framework/utils/util.js');
const cloudUtil = require('../../../../framework/cloud/cloud_util.js');
const cloudBase = require('../../../../framework/cloud/cloud_base.js');
const timeUtil = require('../../../../framework/utils/time_util.js');
const dataUtil = require('../../../../framework/utils/data_util.js');
const setupUtil = require('../../../../framework/utils/setup/setup_util.js');
const config = require('../../../../config/config.js');
const ActivityModel = require('../../model/activity_model.js');
const ActivityJoinModel = require('../../model/activity_join_model.js');
const UserModel = require('../../model/user_model.js');
const exportUtil = require('../../../../framework/utils/export_util.js');

// 导出报名数据KEY
const EXPORT_ACTIVITY_JOIN_DATA_KEY = 'EXPORT_ACTIVITY_JOIN_DATA';

class AdminActivityService extends BaseProjectAdminService {

 

	/**取得分页列表 */
	async getAdminActivityList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		whereEx, //附加查询条件
		page,
		size,
		isTotal = true,
		oldTotal
	}) {

		orderBy = orderBy || {
			'ACTIVITY_ORDER': 'asc',
			'ACTIVITY_ADD_TIME': 'desc'
		};
		let fields = 'ACTIVITY_JOIN_CNT,ACTIVITY_TITLE,ACTIVITY_CATE_ID,ACTIVITY_CATE_NAME,ACTIVITY_EDIT_TIME,ACTIVITY_ADD_TIME,ACTIVITY_ORDER,ACTIVITY_STATUS,ACTIVITY_VOUCH,ACTIVITY_MAX_CNT,ACTIVITY_START,ACTIVITY_END,ACTIVITY_STOP,ACTIVITY_CANCEL_SET,ACTIVITY_CHECK_SET,ACTIVITY_QR,ACTIVITY_OBJ';

		let where = {};
		where.and = {
			_pid: this.getProjectId() //复杂的查询在此处标注PID
		};

		if (util.isDefined(search) && search) {
			where.or = [{
				ACTIVITY_TITLE: ['like', search]
			},];

		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'cateId': {
					where.and.ACTIVITY_CATE_ID = String(sortVal);
					break;
				}
				case 'status': {
					where.and.ACTIVITY_STATUS = Number(sortVal);
					break;
				}
				case 'vouch': {
					where.and.ACTIVITY_VOUCH = 1;
					break;
				}
				case 'top': {
					where.and.ACTIVITY_ORDER = 0;
					break;
				}
				case 'sort': {
					orderBy = this.fmtOrderBySort(sortVal, 'ACTIVITY_ADD_TIME');
					break;
				}
			}
		}

		return await ActivityModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/**置顶与排序设定 */
	async sortActivity(id, sort) {
		sort = Number(sort);
		let data = {};
		data.ACTIVITY_ORDER = sort;
		await ActivityModel.edit(id, data);
	}

	/**获取信息 */
	async getActivityDetail(id) {
		let fields = '*';

		let where = {
			_id: id
		}

		let activity = await ActivityModel.getOne(where, fields);
		if (!activity) return null;

		return activity;
	}


	/**首页设定 */
	async vouchActivity(id, vouch) {
		let data = { ACTIVITY_VOUCH: Number(vouch) };
		await ActivityModel.edit(id, data);
 
	}

	/**添加 */
	async insertActivity({
		title,
		cateId,
		cateName,

		maxCnt,
		start,
		end,
		stop,

		address,
		addressGeo,

		cancelSet,
		checkSet,
		isMenu,

		order,
		forms = [],
		joinForms = [],
	}) {

		// 时间转换为时间戳
		start = timeUtil.time2Timestamp(start);
		end = timeUtil.time2Timestamp(end);
		stop = timeUtil.time2Timestamp(stop);

		// 表单数组转为对象
		let obj = dataUtil.dbForms2Obj(forms);

		let data = {
			ACTIVITY_TITLE: title,
			ACTIVITY_CATE_ID: cateId,
			ACTIVITY_CATE_NAME: cateName,

			ACTIVITY_MAX_CNT: maxCnt,
			ACTIVITY_START: start,
			ACTIVITY_END: end,
			ACTIVITY_STOP: stop,

			ACTIVITY_ADDRESS: address,
			ACTIVITY_ADDRESS_GEO: addressGeo,

			ACTIVITY_CANCEL_SET: cancelSet,
			ACTIVITY_CHECK_SET: checkSet,
			ACTIVITY_IS_MENU: isMenu,

			ACTIVITY_ORDER: order,
			ACTIVITY_FORMS: forms,
			ACTIVITY_OBJ: obj,

			ACTIVITY_JOIN_FORMS: joinForms
		}

		let id = await ActivityModel.insert(data);

		// 生成活动详情小程序码
		try {
			let qr = await this.genDetailQr('activity', id);
			if (qr) await ActivityModel.edit(id, { ACTIVITY_QR: qr });
		} catch (err) {
			console.log('生成活动小程序码失败', err);
		}

		return { id };
	}

	//#############################   
	/** 清空 */
	async clearActivityAll(activityId) {
		// 删除该活动下所有报名记录（先清理表单图片）
		let where = {
			ACTIVITY_JOIN_ACTIVITY_ID: activityId
		}

		let joinList = await ActivityJoinModel.getAll(where, 'ACTIVITY_JOIN_FORMS');
		for (let k = 0; k < joinList.length; k++) {
			await cloudUtil.handlerCloudFilesForForms(joinList[k].ACTIVITY_JOIN_FORMS, []);
		}

		await ActivityJoinModel.del(where);

		// 重新统计
		let service = new ActivityService();
		await service.statActivityJoin(activityId);
	}


	/**删除数据 */
	async delActivity(id) {
		// 先取出活动，用于清理活动表单图片及二维码
		let activity = await ActivityModel.getOne(id, 'ACTIVITY_FORMS,ACTIVITY_QR');
		if (!activity) return;

		// 删除活动表单图片
		if (activity.ACTIVITY_FORMS)
			await cloudUtil.handlerCloudFilesForForms(activity.ACTIVITY_FORMS, []);

		// 删除活动二维码
		if (activity.ACTIVITY_QR)
			await cloudUtil.deleteFiles(activity.ACTIVITY_QR);

		// 删除关联报名记录（先清理报名表单图片）
		let whereJoin = {
			ACTIVITY_JOIN_ACTIVITY_ID: id
		}
		let joinList = await ActivityJoinModel.getAll(whereJoin, 'ACTIVITY_JOIN_FORMS');
		for (let k = 0; k < joinList.length; k++) {
			await cloudUtil.handlerCloudFilesForForms(joinList[k].ACTIVITY_JOIN_FORMS, []);
		}
		await ActivityJoinModel.del(whereJoin);

		// 删除活动
		await ActivityModel.del(id);
	}
	
	// 更新forms信息
	async updateActivityForms({
		id,
		hasImageForms
	}) {
		// 取出旧forms，用于清理被替换或删除的图片
		let activity = await ActivityModel.getOne(id, 'ACTIVITY_FORMS');
		if (!activity) return;

		await cloudUtil.handlerCloudFilesForForms(activity.ACTIVITY_FORMS, hasImageForms);

		// 更新表单图片字段并重算OBJ
		await ActivityModel.editForms(id, 'ACTIVITY_FORMS', 'ACTIVITY_OBJ', hasImageForms);
 
	}

	/**更新数据 */
	async editActivity({
		id,
		title,
		cateId, // 二级分类 
		cateName,

		maxCnt,
		start,
		end,
		stop,

		address,
		addressGeo,

		cancelSet,
		checkSet,
		isMenu,

		order,
		forms = [],
		joinForms = []
	}) { 

		// 取出旧活动（用于清理旧表单图片）
		let oldActivity = await ActivityModel.getOne(id, 'ACTIVITY_FORMS');
		if (!oldActivity) this.AppError('该活动不存在');

		// 时间转换
		start = timeUtil.time2Timestamp(start);
		end = timeUtil.time2Timestamp(end);
		stop = timeUtil.time2Timestamp(stop);

		// 清理被删除/替换的表单图片
		if (oldActivity.ACTIVITY_FORMS)
			await cloudUtil.handlerCloudFilesForForms(oldActivity.ACTIVITY_FORMS, forms);

		// 表单数组转为对象
		let obj = dataUtil.dbForms2Obj(forms);

		let data = {
			ACTIVITY_TITLE: title,
			ACTIVITY_CATE_ID: cateId,
			ACTIVITY_CATE_NAME: cateName,

			ACTIVITY_MAX_CNT: maxCnt,
			ACTIVITY_START: start,
			ACTIVITY_END: end,
			ACTIVITY_STOP: stop,

			ACTIVITY_ADDRESS: address,
			ACTIVITY_ADDRESS_GEO: addressGeo,

			ACTIVITY_CANCEL_SET: cancelSet,
			ACTIVITY_CHECK_SET: checkSet,
			ACTIVITY_IS_MENU: isMenu,

			ACTIVITY_ORDER: order,
			ACTIVITY_FORMS: forms,
			ACTIVITY_OBJ: obj,

			ACTIVITY_JOIN_FORMS: joinForms
		}

		await ActivityModel.edit(id, data);
	}

	/**修改状态 */
	async statusActivity(id, status) {
		let data = { ACTIVITY_STATUS: Number(status) };
		await ActivityModel.edit(id, data);
	}

	//#############################
	/**报名分页列表 */
	async getActivityJoinList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		activityId,
		page,
		size,
		isTotal = true,
		oldTotal
	}) {

		orderBy = orderBy || {
			'ACTIVITY_JOIN_ADD_TIME': 'desc'
		};
		let fields = '*';

		let where = {
			ACTIVITY_JOIN_ACTIVITY_ID: activityId
		};
		if (util.isDefined(search) && search) {
			where['ACTIVITY_JOIN_FORMS.val'] = {
				$regex: '.*' + search,
				$options: 'i'
			};
		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'status':
					// 按类型  
					where.ACTIVITY_JOIN_STATUS = Number(sortVal);
					break;
				case 'checkin':
					// 签到
					where.ACTIVITY_JOIN_STATUS = ActivityJoinModel.STATUS.SUCC;
					if (sortVal == 1) {
						where.ACTIVITY_JOIN_IS_CHECKIN = 1;
					} else {
						where.ACTIVITY_JOIN_IS_CHECKIN = 0;
					}
					break;
			}
		}

		return await ActivityJoinModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/**修改报名状态  
	 */
	async statusActivityJoin(activityJoinId, status, reason = '') {
		status = Number(status);

		let where = {
			_id: activityJoinId
		}
		let activityJoin = await ActivityJoinModel.getOne(where);
		if (!activityJoin)
			this.AppError('报名记录不存在');

		let data = {
			ACTIVITY_JOIN_STATUS: status
		};

		// 审核拒绝：记录理由并重置签到状态
		if (status == ActivityJoinModel.STATUS.ADMIN_CANCEL) {
			data.ACTIVITY_JOIN_REASON = reason;
			data.ACTIVITY_JOIN_IS_CHECKIN = 0;
			data.ACTIVITY_JOIN_CHECKIN_TIME = 0;
		} else {
			data.ACTIVITY_JOIN_REASON = '';
		}

		await ActivityJoinModel.edit(where, data);

		// 审核通过/拒绝后重新统计人数
		let service = new ActivityService();
		await service.statActivityJoin(activityJoin.ACTIVITY_JOIN_ACTIVITY_ID);

		// 发送订阅消息通知用户（失败不影响主流程）
		try {
			await this._sendAuditSubscribeMessage(activityJoin, status, reason);
		} catch (err) {
			console.log('发送审核订阅消息失败', err);
		}
	}

	/** 发送审核结果订阅消息 */
	async _sendAuditSubscribeMessage(activityJoin, status, reason = '') {
		// 模板ID优先取setup，再取config
		let templateId = await setupUtil.get('ACTIVITY_SUBSCRIBE_TEMPLATE_ID');
		if (!templateId) templateId = config.ACTIVITY_SUBSCRIBE_TEMPLATE_ID;
		if (!templateId) return;

		// 获取活动名称
		let activity = await ActivityModel.getOne(activityJoin.ACTIVITY_JOIN_ACTIVITY_ID, 'ACTIVITY_TITLE');
		if (!activity) return;

		// 审核结果
		let resultDesc = (status == ActivityJoinModel.STATUS.SUCC) ? '审核通过' : '审核未通过';
		if (status != ActivityJoinModel.STATUS.SUCC && status != ActivityJoinModel.STATUS.ADMIN_CANCEL)
			return;

		let data = {
			thing1: { value: activity.ACTIVITY_TITLE },
			phrase2: { value: resultDesc },
			thing3: { value: reason || '感谢您的报名' }
		};

		let page = 'projects/' + this.getProjectId() + '/pages/activity/my_join/my_join';

		await cloudBase.sendSubscribeMessage(
			activityJoin.ACTIVITY_JOIN_USER_ID,
			templateId,
			data,
			page
		);
	}

	/**批量审核报名
	 * 注意：审核涉及逐条发送订阅消息通知，无法整体放入单个数据库事务。
	 * 这里采用"逐条处理 + 失败收集"策略：任一单条失败不会中断整体，
	 * 最终返回成功/失败数量，由上层给操作者明确提示，避免"静默部分成功"。
	 */
	async batchStatusActivityJoin(activityJoinIds, status, reason = '') {
		if (!Array.isArray(activityJoinIds) || activityJoinIds.length == 0) {
			return { total: 0, succ: 0, fail: 0, failIds: [] };
		}

		let succ = 0, fail = 0;
		let failIds = [];
		for (let k = 0; k < activityJoinIds.length; k++) {
			try {
				await this.statusActivityJoin(activityJoinIds[k], status, reason);
				succ++;
			} catch (e) {
				fail++;
				failIds.push(activityJoinIds[k]);
				console.log('[batchStatusActivityJoin] 单条审核失败 id=' + activityJoinIds[k], e);
			}
		}
		return { total: activityJoinIds.length, succ, fail, failIds };
	}

	/**批量删除报名
	 * 删除涉及级联清理云存储图片，逐条处理并收集失败，最后统一重算涉及活动的统计。
	 */
	async batchDelActivityJoin(activityJoinIds) {
		if (!Array.isArray(activityJoinIds) || activityJoinIds.length == 0) {
			return { total: 0, succ: 0, fail: 0, failIds: [] };
		}

		let succ = 0, fail = 0;
		let failIds = [];
		let activityIds = new Set();
		for (let k = 0; k < activityJoinIds.length; k++) {
			try {
				// 先取出记录用于事后重算统计
				let join = await ActivityJoinModel.getOne(activityJoinIds[k], 'ACTIVITY_JOIN_ACTIVITY_ID');
				await this.delActivityJoin(activityJoinIds[k]);
				if (join) activityIds.add(join.ACTIVITY_JOIN_ACTIVITY_ID);
				succ++;
			} catch (e) {
				fail++;
				failIds.push(activityJoinIds[k]);
				console.log('[batchDelActivityJoin] 单条删除失败 id=' + activityJoinIds[k], e);
			}
		}

		// 统一重算涉及活动的报名统计，保证统计数据最终一致
		for (let aid of activityIds) {
			try {
				let activityService = new ActivityService();
				await activityService.statActivityJoin(aid);
			} catch (e) {
				console.log('[batchDelActivityJoin] 重算统计失败 activityId=' + aid, e);
			}
		}

		return { total: activityJoinIds.length, succ, fail, failIds };
	}

	/**批量删除活动
	 * 活动删除涉及大量级联清理（表单图片、二维码、报名记录），逐条处理并收集失败。
	 */
	async batchDelActivity(ids) {
		if (!Array.isArray(ids) || ids.length == 0) {
			return { total: 0, succ: 0, fail: 0, failIds: [] };
		}

		let succ = 0, fail = 0;
		let failIds = [];
		for (let k = 0; k < ids.length; k++) {
			try {
				await this.delActivity(ids[k]);
				succ++;
			} catch (e) {
				fail++;
				failIds.push(ids[k]);
				console.log('[batchDelActivity] 单条删除失败 id=' + ids[k], e);
			}
		}
		return { total: ids.length, succ, fail, failIds };
	}

	/**批量修改活动状态
	 * 纯字段更新，使用 in 条件一次原子更新，避免循环单条更新中途失败。
	 */
	async batchStatusActivity(ids, status) {
		if (!Array.isArray(ids) || ids.length == 0) return { total: 0, updated: 0 };
		status = Number(status);

		let where = {
			_id: ['in', ids],
			_pid: this.getProjectId()
		};
		let updated = await ActivityModel.edit(where, { ACTIVITY_STATUS: status });
		return { total: ids.length, updated };
	}


	/** 取消某项目的所有报名记录 */
	async cancelActivityJoinAll(activityId, reason) {
		// 仅取消待审核与成功的记录
		let where = {
			ACTIVITY_JOIN_ACTIVITY_ID: activityId,
			ACTIVITY_JOIN_STATUS: ['in', [ActivityJoinModel.STATUS.WAIT, ActivityJoinModel.STATUS.SUCC]]
		}
		let data = {
			ACTIVITY_JOIN_STATUS: ActivityJoinModel.STATUS.ADMIN_CANCEL,
			ACTIVITY_JOIN_REASON: reason,
			ACTIVITY_JOIN_IS_CHECKIN: 0,
			ACTIVITY_JOIN_CHECKIN_TIME: 0
		}

		await ActivityJoinModel.edit(where, data);

		// 重新统计人数
		let service = new ActivityService();
		await service.statActivityJoin(activityId);
	}

	/** 删除报名 */
	async delActivityJoin(activityJoinId) {
		let where = {
			_id: activityJoinId
		}

		// 取出报名记录，用于清理表单图片与重算统计
		let activityJoin = await ActivityJoinModel.getOne(where, 'ACTIVITY_JOIN_FORMS,ACTIVITY_JOIN_ACTIVITY_ID');
		if (!activityJoin) return;

		// 删除报名表单图片
		await cloudUtil.handlerCloudFilesForForms(activityJoin.ACTIVITY_JOIN_FORMS, []);

		await ActivityJoinModel.del(where);

		// 重新统计人数
		let service = new ActivityService();
		await service.statActivityJoin(activityJoin.ACTIVITY_JOIN_ACTIVITY_ID);

	}

	/** 自助签到码 */
	async genActivitySelfCheckinQr(page, activityId) {
		// 校验活动是否存在
		let activity = await ActivityModel.getOne(activityId, 'ACTIVITY_TITLE');
		if (!activity) this.AppError('该活动不存在');

		if (page.startsWith('/')) page = page.substring(1);

		// 生成小程序码
		const cloud = cloudBase.getCloud();
		let result = await cloud.openapi.wxacode.getUnlimited({
			scene: activityId,
			width: 280,
			check_path: false,
			page
		});

		// 上传到云存储
		let cloudPath = this.getProjectId() + '/activity/' + activityId + '/self_checkin_qr.png';
		let upload = await cloud.uploadFile({
			cloudPath,
			fileContent: result.buffer,
		});

		if (!upload || !upload.fileID) return;

		// 更新活动二维码
		await ActivityModel.edit(activityId, { ACTIVITY_QR: upload.fileID });

		// 返回临时链接供前端展示
		let url = await cloudUtil.getTempFileURLOne(upload.fileID);
		return url + '?rd=' + this._timestamp;
	}

	/** 管理员按钮核销 */
	async checkinActivityJoin(activityJoinId, flag) {
		flag = Number(flag);

		let where = {
			_id: activityJoinId,
			ACTIVITY_JOIN_STATUS: ActivityJoinModel.STATUS.SUCC
		}

		let data = {
			ACTIVITY_JOIN_IS_CHECKIN: flag
		};

		if (flag == 1) {
			data.ACTIVITY_JOIN_CHECKIN_TIME = this._timestamp;
		} else {
			data.ACTIVITY_JOIN_CHECKIN_TIME = 0;
		}

		await ActivityJoinModel.edit(where, data);
	}

	/** 管理员扫码核销 */
	async scanActivityJoin(activityId, code) {
		let where = {
			ACTIVITY_JOIN_ACTIVITY_ID: activityId,
			ACTIVITY_JOIN_CODE: code,
			ACTIVITY_JOIN_STATUS: ActivityJoinModel.STATUS.SUCC
		}

		let activityJoin = await ActivityJoinModel.getOne(where);
		if (!activityJoin)
			this.AppError('核销码无效或该报名未通过审核');

		if (activityJoin.ACTIVITY_JOIN_IS_CHECKIN == 1)
			this.AppError('该报名已经核销，请勿重复核销');

		let data = {
			ACTIVITY_JOIN_IS_CHECKIN: 1,
			ACTIVITY_JOIN_CHECKIN_TIME: this._timestamp
		}

		await ActivityJoinModel.edit(where, data);

		return activityJoin;
	}

	// #####################导出报名数据
	/**获取报名数据 */
	async getActivityJoinDataURL() {
		return await exportUtil.getExportDataURL(EXPORT_ACTIVITY_JOIN_DATA_KEY);
	}

	/**删除报名数据 */
	async deleteActivityJoinDataExcel() {
		return await exportUtil.deleteDataExcel(EXPORT_ACTIVITY_JOIN_DATA_KEY);
	}

	/**导出报名数据 */
	async exportActivityJoinDataExcel({
		activityId,
		status
	}) {
		// 取出活动及自定义报名字段
		let activity = await ActivityModel.getOne(activityId, 'ACTIVITY_TITLE,ACTIVITY_JOIN_FORMS');
		if (!activity) this.AppError('该活动不存在');

		let joinForms = activity.ACTIVITY_JOIN_FORMS || [];

		// 表头：基础信息 + 自定义字段
		let title = [
			{ column: '序号', wch: 8 },
			{ column: '报名时间', wch: 20 },
			{ column: '微信昵称', wch: 20 },
			{ column: '手机号', wch: 15 }
		];

		// 动态加入自定义字段表头（图片/图文不导出）
		for (let k = 0; k < joinForms.length; k++) {
			if (joinForms[k].type == 'image' || joinForms[k].type == 'content') continue;
			title.push({ column: joinForms[k].title, wch: 20 });
		}

		title.push({ column: '状态', wch: 12 });
		title.push({ column: '签到状态', wch: 12 });
		title.push({ column: '签到时间', wch: 20 });

		// 查询条件
		let where = {
			ACTIVITY_JOIN_ACTIVITY_ID: activityId
		};
		status = Number(status);
		if (status && status != -1 && status != 999) {
			where.ACTIVITY_JOIN_STATUS = status;
		}

		// 关联用户表
		let joinParams = {
			from: UserModel.CL,
			localField: 'ACTIVITY_JOIN_USER_ID',
			foreignField: 'USER_MINI_OPENID',
			as: 'user',
		};

		let orderBy = {
			'ACTIVITY_JOIN_ADD_TIME': 'desc'
		};

		// 导出上限：单次最多导出 10000 条，超量需缩小筛选范围，避免数据被静默截断
		const EXPORT_MAX_CNT = 10000;

		// 先统计符合条件的总数，若超出上限直接提示，不做静默截断
		let totalCnt = await ActivityJoinModel.count(where);
		if (totalCnt > EXPORT_MAX_CNT) {
			this.AppError('当前筛选条件下共有 ' + totalCnt + ' 条记录，超过单次导出上限 ' + EXPORT_MAX_CNT + ' 条，请按状态或时间缩小范围后分批导出');
		}

		// 一次性取出全部报名数据
		let result = await ActivityJoinModel.getListJoin(joinParams, where, '*', orderBy, 1, EXPORT_MAX_CNT, false, 0);
		let list = result.list || [];

		let data = [];
		data.push(title.map(t => t.column));

		for (let k = 0; k < list.length; k++) {
			let node = list[k];
			let row = [];

			row.push(k + 1);
			row.push(timeUtil.timestamp2Time(node.ACTIVITY_JOIN_ADD_TIME, 'Y-M-D h:m:s'));
			row.push(node.user ? (node.user.USER_NAME || '') : '');
			row.push(node.user ? (node.user.USER_MOBILE || '') : '');

			// 自定义字段值（按定义顺序填充）
			let forms = node.ACTIVITY_JOIN_FORMS || [];
			for (let j = 0; j < joinForms.length; j++) {
				if (joinForms[j].type == 'image' || joinForms[j].type == 'content') continue;
				let val = dataUtil.getValByForm(forms, joinForms[j].mark, joinForms[j].title);
				if (Array.isArray(val)) val = val.join(',');
				row.push(val);
			}

			row.push(ActivityJoinModel.getDesc('STATUS', node.ACTIVITY_JOIN_STATUS));
			row.push(node.ACTIVITY_JOIN_IS_CHECKIN == 1 ? '已签到' : '未签到');
			row.push(node.ACTIVITY_JOIN_CHECKIN_TIME ? timeUtil.timestamp2Time(node.ACTIVITY_JOIN_CHECKIN_TIME, 'Y-M-D h:m:s') : '');

			data.push(row);
		}

		let total = data.length - 1;

		// 列宽配置
		let options = { '!cols': title.map(t => ({ wch: t.wch })) };

		return await exportUtil.exportDataExcel(
			EXPORT_ACTIVITY_JOIN_DATA_KEY,
			activity.ACTIVITY_TITLE + '-报名名单',
			total,
			data,
			options
		);

	}
}

module.exports = AdminActivityService;
