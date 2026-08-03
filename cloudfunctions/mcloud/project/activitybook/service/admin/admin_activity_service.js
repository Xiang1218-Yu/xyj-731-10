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
		forms,
		joinForms,
	}) {

		// 时间转换
		start = timeUtil.time2Timestamp(start);
		end = timeUtil.time2Timestamp(end);
		stop = timeUtil.time2Timestamp(stop);

		// 表单处理
		let obj = dataUtil.dbForms2Obj(forms);
		let joinObj = dataUtil.dbForms2Obj(joinForms);

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

			ACTIVITY_JOIN_FORMS: joinForms,
			ACTIVITY_JOIN_OBJ: joinObj,

			ACTIVITY_STATUS: ActivityModel.STATUS.COMM
		}

		let id = await ActivityModel.insert(data);

		// 生成二维码
		let qr = await this.genDetailQr('activity', id);
		if (qr) {
			await ActivityModel.edit(id, { ACTIVITY_QR: qr });
		}

		return { id };
	}

	//#############################   
	/** 清空 */
	async clearActivityAll(activityId) {
		// 删除所有报名记录
		let where = {
			ACTIVITY_JOIN_ACTIVITY_ID: activityId
		}

		// 获取所有报名记录的表单图片用于删除
		let joinList = await ActivityJoinModel.getAll(where, 'ACTIVITY_JOIN_FORMS');
		for (let k = 0; k < joinList.length; k++) {
			await cloudUtil.handlerCloudFilesForForms(joinList[k].ACTIVITY_JOIN_FORMS, []);
		}

		await ActivityJoinModel.del(where);

		// 更新统计
		let service = new ActivityService();
		await service.statActivityJoin(activityId);
	}


	/**删除数据 */
	async delActivity(id) {
		// 先获取活动信息
		let activity = await ActivityModel.getOne(id, 'ACTIVITY_FORMS,ACTIVITY_QR');
		if (!activity) return;

		// 删除活动表单图片
		await cloudUtil.handlerCloudFilesForForms(activity.ACTIVITY_FORMS, []);

		// 删除二维码
		if (activity.ACTIVITY_QR) {
			await cloudUtil.deleteFiles(activity.ACTIVITY_QR);
		}

		// 删除关联的报名记录
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
		// 获取旧表单
		let activity = await ActivityModel.getOne(id, 'ACTIVITY_FORMS');
		if (!activity) return;

		// 处理图片删除
		await cloudUtil.handlerCloudFilesForForms(activity.ACTIVITY_FORMS, hasImageForms);

		// 更新表单
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
		forms,
		joinForms
	}) { 

		// 获取旧活动
		let oldActivity = await ActivityModel.getOne(id, 'ACTIVITY_FORMS');
		if (!oldActivity) return;

		// 时间转换
		start = timeUtil.time2Timestamp(start);
		end = timeUtil.time2Timestamp(end);
		stop = timeUtil.time2Timestamp(stop);

		// 处理表单图片删除
		await cloudUtil.handlerCloudFilesForForms(oldActivity.ACTIVITY_FORMS, forms);

		// 表单处理
		let obj = dataUtil.dbForms2Obj(forms);
		let joinObj = dataUtil.dbForms2Obj(joinForms);

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

			ACTIVITY_JOIN_FORMS: joinForms,
			ACTIVITY_JOIN_OBJ: joinObj,
		}

		await ActivityModel.edit(id, data);
	}

	/**修改状态 */
	async statusActivity(id, status) {
		let data = { ACTIVITY_STATUS: Number(status) };
		await ActivityModel.edit(id, data);
	}

	/**批量修改活动状态 */
	async batchStatusActivity(ids, status) {
		if (!Array.isArray(ids) || ids.length === 0) return;

		// 一次批量更新状态（MultiModel.edit 自动追加 _pid）
		await ActivityModel.edit({ _id: ['in', ids] }, { ACTIVITY_STATUS: Number(status) });
	}

	/**批量删除活动 */
	async batchDelActivity(ids) {
		if (!Array.isArray(ids) || ids.length === 0) return;

		// 一次查出所有待删除活动（用于清理云文件）
		let activityList = await ActivityModel.getAllBig({ _id: ['in', ids] }, 'ACTIVITY_FORMS,ACTIVITY_QR');

		// 循环清理每个活动的云文件（云存储不支持批量条件删除）
		for (let k = 0; k < activityList.length; k++) {
			await cloudUtil.handlerCloudFilesForForms(activityList[k].ACTIVITY_FORMS, []);

			// 删除二维码
			if (activityList[k].ACTIVITY_QR) {
				await cloudUtil.deleteFiles(activityList[k].ACTIVITY_QR);
			}
		}

		// 一次查出所有关联报名（用于清理报名表单云文件）
		let joinList = await ActivityJoinModel.getAllBig({ ACTIVITY_JOIN_ACTIVITY_ID: ['in', ids] }, 'ACTIVITY_JOIN_FORMS');

		// 循环清理报名表单云文件
		for (let k = 0; k < joinList.length; k++) {
			await cloudUtil.handlerCloudFilesForForms(joinList[k].ACTIVITY_JOIN_FORMS, []);
		}

		// 批量删除所有报名记录
		await ActivityJoinModel.del({ ACTIVITY_JOIN_ACTIVITY_ID: ['in', ids] });

		// 批量删除所有活动
		await ActivityModel.del({ _id: ['in', ids] });
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
		// 获取报名记录
		let where = {
			_id: activityJoinId
		}
		let activityJoin = await ActivityJoinModel.getOne(where);
		if (!activityJoin)
			this.AppError('报名记录不存在');

		// 获取活动信息用于订阅消息通知
		let activity = await ActivityModel.getOne(activityJoin.ACTIVITY_JOIN_ACTIVITY_ID, 'ACTIVITY_TITLE');

		status = Number(status);

		let data = {
			ACTIVITY_JOIN_STATUS: status,
			ACTIVITY_JOIN_REASON: reason
		}

		await ActivityJoinModel.edit(where, data);

		// 更新活动统计
		let service = new ActivityService();
		await service.statActivityJoin(activityJoin.ACTIVITY_JOIN_ACTIVITY_ID);

		// 发送订阅消息通知（失败不影响主流程）
		try {
			const cloud = cloudBase.getCloud();
			let isPass = (status == ActivityJoinModel.STATUS.SUCC);
			let resultText = isPass ? '通过' : '未通过';
			let remark = reason || (isPass ? '您的报名已审核通过' : '您的报名未通过审核');

			await cloud.openapi.subscribeMessage.send({
				touser: activityJoin.ACTIVITY_JOIN_USER_ID,
				templateId: 'ACTIVITY_JOIN_TEMPLATE_ID',
				page: 'projects/activitybook/pages/activity/my_join_detail/activity_my_join_detail?id=' + activityJoinId,
				data: {
					thing1: { value: activity ? activity.ACTIVITY_TITLE : '' },
					phrase2: { value: resultText },
					thing3: { value: remark }
				}
			});
		} catch (err) {
			console.log('订阅消息发送失败', err);
		}
	}


	/** 取消某项目的所有报名记录 */
	async cancelActivityJoinAll(activityId, reason) {
		let data = {
			ACTIVITY_JOIN_STATUS: ActivityJoinModel.STATUS.ADMIN_CANCEL,
			ACTIVITY_JOIN_REASON: reason
		}

		let where = {
			ACTIVITY_JOIN_ACTIVITY_ID: activityId,
			ACTIVITY_JOIN_STATUS: ['in', [ActivityJoinModel.STATUS.WAIT, ActivityJoinModel.STATUS.SUCC]]
		}

		await ActivityJoinModel.edit(where, data);

		// 更新统计
		let service = new ActivityService();
		await service.statActivityJoin(activityId);
	}

	/** 删除报名 */
	async delActivityJoin(activityJoinId) {
		let where = {
			_id: activityJoinId
		}

		// 获取报名记录
		let activityJoin = await ActivityJoinModel.getOne(where, 'ACTIVITY_JOIN_FORMS,ACTIVITY_JOIN_ACTIVITY_ID');
		if (!activityJoin) return;

		// 删除表单图片
		await cloudUtil.handlerCloudFilesForForms(activityJoin.ACTIVITY_JOIN_FORMS, []);

		await ActivityJoinModel.del(where);

		// 更新统计
		let service = new ActivityService();
		await service.statActivityJoin(activityJoin.ACTIVITY_JOIN_ACTIVITY_ID);
	}

	/** 自助签到码 */
	async genActivitySelfCheckinQr(page, activityId) {
		// 生成签到二维码
		let cloud = cloudBase.getCloud();

		let pagePath = `projects/${this.getProjectId()}/pages/activity/my_join_self/activity_my_join_self`;
		console.log('page=', pagePath);
		let result = await cloud.openapi.wxacode.getUnlimited({
			scene: activityId,
			width: 280,
			check_path: false,
			page: pagePath
		});

		let cloudPath = `${this.getProjectId()}/activity/${activityId}/checkin_qr.png`;
		console.log('cloudPath=', cloudPath);
		let upload = await cloud.uploadFile({
			cloudPath,
			fileContent: result.buffer,
		});

		if (!upload || !upload.fileID) return;

		// 更新活动二维码
		await ActivityModel.edit(activityId, { ACTIVITY_QR: upload.fileID });

		return upload.fileID;
	}

	/** 管理员按钮核销 */
	async checkinActivityJoin(activityJoinId, flag) {
		let where = {
			_id: activityJoinId,
			ACTIVITY_JOIN_STATUS: ActivityJoinModel.STATUS.SUCC
		}

		let data = {
			ACTIVITY_JOIN_IS_CHECKIN: Number(flag)
		}

		if (Number(flag) == 1) {
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

	/**批量修改报名状态 */
	async batchStatusActivityJoin(ids, status, reason = '') {
		if (!Array.isArray(ids) || ids.length === 0) return;

		// 一次查出所有报名记录（用于按活动去重重算统计）
		let joinList = await ActivityJoinModel.getAllBig({ _id: ['in', ids] }, 'ACTIVITY_JOIN_ACTIVITY_ID');

		// 一次批量更新状态与原因
		await ActivityJoinModel.edit({ _id: ['in', ids] }, {
			ACTIVITY_JOIN_STATUS: Number(status),
			ACTIVITY_JOIN_REASON: reason || ''
		});

		// 提取不重复的 activityId，每个活动只重算一次统计
		let aidSet = new Set();
		for (let k = 0; k < joinList.length; k++) {
			aidSet.add(joinList[k].ACTIVITY_JOIN_ACTIVITY_ID);
		}

		let service = new ActivityService();
		for (let aid of aidSet) {
			await service.statActivityJoin(aid);
		}
	}

	/**批量删除报名 */
	async batchDelActivityJoin(ids) {
		if (!Array.isArray(ids) || ids.length === 0) return;

		// 一次查出所有待删除报名（用于清理云文件与重算统计）
		let joinList = await ActivityJoinModel.getAllBig({ _id: ['in', ids] }, 'ACTIVITY_JOIN_FORMS,ACTIVITY_JOIN_ACTIVITY_ID');

		// 循环清理报名表单云文件（云存储不支持批量条件删除）
		for (let k = 0; k < joinList.length; k++) {
			await cloudUtil.handlerCloudFilesForForms(joinList[k].ACTIVITY_JOIN_FORMS, []);
		}

		// 批量删除报名记录
		await ActivityJoinModel.del({ _id: ['in', ids] });

		// 提取不重复的 activityId，每个活动只重算一次统计
		let aidSet = new Set();
		for (let k = 0; k < joinList.length; k++) {
			aidSet.add(joinList[k].ACTIVITY_JOIN_ACTIVITY_ID);
		}

		let service = new ActivityService();
		for (let aid of aidSet) {
			await service.statActivityJoin(aid);
		}
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
		// 获取活动信息（包含报名表单设置）
		let activity = await ActivityModel.getOne(activityId, 'ACTIVITY_TITLE,ACTIVITY_JOIN_FORMS');
		if (!activity)
			this.AppError('活动不存在');

		let joinForms = activity.ACTIVITY_JOIN_FORMS || [];

		// 构建表头
		let title = [
			{ column: '序号', wch: 10 },
			{ column: '昵称', wch: 20 },
			{ column: '手机号', wch: 20 },
		];

		// 添加自定义表单字段列
		let formTitle = dataUtil.getTitleByForm(joinForms);
		title = title.concat(formTitle);

		title.push({ column: '状态', wch: 15 });
		title.push({ column: '报名时间', wch: 25 });
		title.push({ column: '是否签到', wch: 15 });
		title.push({ column: '签到时间', wch: 25 });
		title.push({ column: '备注', wch: 30 });

		// 查询条件
		let where = {
			ACTIVITY_JOIN_ACTIVITY_ID: activityId
		}
		if (status && Number(status) != -1) {
			where.ACTIVITY_JOIN_STATUS = Number(status);
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
		}

		// 获取所有数据（不分页）
		let result = await ActivityJoinModel.getListJoin(joinParams, where, '*', orderBy, 1, 10000, false, 0);
		let list = result.list || [];

		let data = [];
		data.push(title.map(t => t.column));

		for (let k = 0; k < list.length; k++) {
			let row = [];
			row.push(k + 1);
			row.push(list[k].user ? (list[k].user.USER_NAME || '') : '');
			row.push(list[k].user ? (list[k].user.USER_MOBILE || '') : '');

			// 自定义表单字段
			let forms = list[k].ACTIVITY_JOIN_FORMS || [];
			for (let j = 0; j < joinForms.length; j++) {
				if (joinForms[j].type == 'image' || joinForms[j].type == 'content') continue;
				let val = dataUtil.getValByForm(forms, joinForms[j].mark, joinForms[j].title);
				row.push(val);
			}

			row.push(ActivityJoinModel.getDesc('STATUS', list[k].ACTIVITY_JOIN_STATUS));
			row.push(timeUtil.timestamp2Time(list[k].ACTIVITY_JOIN_ADD_TIME));
			row.push(list[k].ACTIVITY_JOIN_IS_CHECKIN == 1 ? '已签到' : '未签到');
			row.push(list[k].ACTIVITY_JOIN_CHECKIN_TIME ? timeUtil.timestamp2Time(list[k].ACTIVITY_JOIN_CHECKIN_TIME) : '');
			row.push(list[k].ACTIVITY_JOIN_REASON || '');

			data.push(row);
		}

		let total = data.length - 1;

		return await exportUtil.exportDataExcel(
			EXPORT_ACTIVITY_JOIN_DATA_KEY,
			activity.ACTIVITY_TITLE + '-报名名单',
			total,
			data
		);
	}
}

module.exports = AdminActivityService;