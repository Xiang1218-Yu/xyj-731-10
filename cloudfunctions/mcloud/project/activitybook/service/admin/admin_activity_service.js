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
const miniLib = require('../../../../framework/lib/mini_lib.js');
const constants = require('../../public/constants.js');

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

		// 组织者自定义报名字段(joinForms)与活动内容字段(forms)一并入库
		let data = {
			ACTIVITY_TITLE: title,
			ACTIVITY_CATE_ID: cateId,
			ACTIVITY_CATE_NAME: cateName,

			ACTIVITY_MAX_CNT: Number(maxCnt), // 人数上限 0=不限
			ACTIVITY_START: timeUtil.time2Timestamp(start),
			ACTIVITY_END: timeUtil.time2Timestamp(end),
			ACTIVITY_STOP: timeUtil.time2Timestamp(stop),

			ACTIVITY_ADDRESS: address,
			ACTIVITY_ADDRESS_GEO: addressGeo,

			ACTIVITY_CANCEL_SET: Number(cancelSet),
			ACTIVITY_CHECK_SET: Number(checkSet), // 报名方式 0=直接通过 1=需审核
			ACTIVITY_IS_MENU: Number(isMenu),

			ACTIVITY_ORDER: Number(order),
			ACTIVITY_FORMS: forms,
			ACTIVITY_OBJ: dataUtil.dbForms2Obj(forms, true), // 富文本内容不入OBJ
			ACTIVITY_JOIN_FORMS: joinForms, // 报名者需填写的自定义表单定义
		};

		let id = await ActivityModel.insert(data);
		return { id };
	}

	//#############################   
	/** 清空 */
	async clearActivityAll(activityId) {
		// 删除该活动下的所有报名记录，并重置统计
		await ActivityJoinModel.del({ ACTIVITY_JOIN_ACTIVITY_ID: activityId });
		await ActivityModel.edit(activityId, {
			ACTIVITY_JOIN_CNT: 0,
			ACTIVITY_USER_LIST: []
		});
	}


	/**删除数据 */
	async delActivity(id) {
		// 删除活动及其关联的报名记录与图片文件
		let activity = await ActivityModel.getOne(id);
		if (!activity) return;

		// 异步清理封面/图集等云文件
		cloudUtil.handlerCloudFilesForForms(activity.ACTIVITY_FORMS, []);

		await ActivityJoinModel.del({ ACTIVITY_JOIN_ACTIVITY_ID: id });
		await ActivityModel.del({ _id: id });
	}

	// 更新forms信息
	async updateActivityForms({
		id,
		hasImageForms
	}) {
		// 图片上传完成后回写活动内容表单中的图片fileID
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

		let data = {
			ACTIVITY_TITLE: title,
			ACTIVITY_CATE_ID: cateId,
			ACTIVITY_CATE_NAME: cateName,

			ACTIVITY_MAX_CNT: Number(maxCnt),
			ACTIVITY_START: timeUtil.time2Timestamp(start),
			ACTIVITY_END: timeUtil.time2Timestamp(end),
			ACTIVITY_STOP: timeUtil.time2Timestamp(stop),

			ACTIVITY_ADDRESS: address,
			ACTIVITY_ADDRESS_GEO: addressGeo,

			ACTIVITY_CANCEL_SET: Number(cancelSet),
			ACTIVITY_CHECK_SET: Number(checkSet),
			ACTIVITY_IS_MENU: Number(isMenu),

			ACTIVITY_ORDER: Number(order),
			ACTIVITY_FORMS: forms,
			ACTIVITY_OBJ: dataUtil.dbForms2Obj(forms, true),
			ACTIVITY_JOIN_FORMS: joinForms,
		};

		// 处理内容表单里被替换/删除的旧图片文件
		let oldActivity = await ActivityModel.getOne(id, 'ACTIVITY_FORMS');
		if (oldActivity)
			cloudUtil.handlerCloudFilesForForms(oldActivity.ACTIVITY_FORMS, forms);

		await ActivityModel.edit(id, data);
		return { id };
	}

	/**修改状态 */
	async statusActivity(id, status) {
		status = Number(status);
		await ActivityModel.edit(id, { ACTIVITY_STATUS: status });
	}

	/** 批量删除活动(含报名记录) */
	async batchDelActivity(ids) {
		if (!ids || ids.length == 0) return;
		for (let k = 0; k < ids.length; k++) {
			await this.delActivity(ids[k]);
		}
	}

	/** 批量修改活动状态 */
	async batchStatusActivity(ids, status) {
		if (!ids || ids.length == 0) return;
		status = Number(status);
		await ActivityModel.edit({ _id: ['in', ids] }, { ACTIVITY_STATUS: status });
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
	 * status: 0=待审核 1=报名成功(通过) 99=审核未过(拒绝)
	 * 通过/拒绝后向报名者发送订阅消息通知
	 */
	async statusActivityJoin(activityJoinId, status, reason = '') {
		status = Number(status);

		let activityJoin = await ActivityJoinModel.getOne(activityJoinId);
		if (!activityJoin)
			this.AppError('报名记录不存在');

		let data = {
			ACTIVITY_JOIN_STATUS: status,
			ACTIVITY_JOIN_REASON: reason
		};
		await ActivityJoinModel.edit(activityJoinId, data);

		// 重新统计报名人数与名单
		let activityService = new ActivityService();
		await activityService.statActivityJoin(activityJoin.ACTIVITY_JOIN_ACTIVITY_ID);

		// 审核结果通知报名者
		if (status == ActivityJoinModel.STATUS.SUCC || status == ActivityJoinModel.STATUS.ADMIN_CANCEL) {
			let resultDesc = (status == ActivityJoinModel.STATUS.SUCC) ? '报名审核通过' : '报名审核未通过';
			await this._sendActivityJoinNotify(activityJoin, resultDesc, reason);
		}
	}

	/**
	 * 向报名者发送审核结果订阅消息
	 * 未配置模板ID时静默跳过，不影响审核主流程
	 */
	async _sendActivityJoinNotify(activityJoin, resultDesc, reason = '') {
		let tmplId = constants.SUBSCRIBE_ACTIVITY_JOIN_TMPL_ID;
		if (!tmplId) return; // 未配置订阅消息模板，跳过通知

		let activity = await ActivityModel.getOne(activityJoin.ACTIVITY_JOIN_ACTIVITY_ID, 'ACTIVITY_TITLE');
		if (!activity) return;

		let body = {
			touser: activityJoin.ACTIVITY_JOIN_USER_ID,
			template_id: tmplId,
			page: 'projects/activitybook/pages/activity/my_join_list/activity_my_join_list',
			data: {
				thing1: { value: miniLib.fmtThing(activity.ACTIVITY_TITLE) },
				phrase2: { value: miniLib.fmtPhrase(resultDesc) },
				thing3: { value: miniLib.fmtThing(reason || '感谢您的参与') },
				time4: { value: timeUtil.time('Y-M-D h:m') }
			}
		};
		await miniLib.sendMiniOnceTempMsg(body, 'activity_join_status');
	}


	/** 取消某项目的所有报名记录 (批量拒绝并通知) */
	async cancelActivityJoinAll(activityId, reason) {
		let where = {
			ACTIVITY_JOIN_ACTIVITY_ID: activityId,
			ACTIVITY_JOIN_STATUS: ['in', [ActivityJoinModel.STATUS.WAIT, ActivityJoinModel.STATUS.SUCC]]
		};

		// 逐条通知报名者
		let list = await ActivityJoinModel.getAll(where, 'ACTIVITY_JOIN_USER_ID,ACTIVITY_JOIN_ACTIVITY_ID', {}, 1000);

		await ActivityJoinModel.edit(where, {
			ACTIVITY_JOIN_STATUS: ActivityJoinModel.STATUS.ADMIN_CANCEL,
			ACTIVITY_JOIN_REASON: reason || ''
		});

		// 重新统计
		let activityService = new ActivityService();
		await activityService.statActivityJoin(activityId);

		for (let k = 0; k < list.length; k++) {
			await this._sendActivityJoinNotify(list[k], '报名审核未通过', reason);
		}
	}

	/** 删除报名 */
	async delActivityJoin(activityJoinId) {
		let activityJoin = await ActivityJoinModel.getOne(activityJoinId);
		if (!activityJoin) return;

		await ActivityJoinModel.del({ _id: activityJoinId });

		// 重新统计
		let activityService = new ActivityService();
		await activityService.statActivityJoin(activityJoin.ACTIVITY_JOIN_ACTIVITY_ID);
	}

	/** 自助签到码 */
	async genActivitySelfCheckinQr(page, activityId) {
		let cloud = cloudBase.getCloud();

		let result = await cloud.openapi.wxacode.getUnlimited({
			scene: activityId,
			width: 280,
			check_path: false,
			page
		});

		let cloudPath = `${this.getProjectId()}/activity/${activityId}/self_qr.png`;
		let upload = await cloud.uploadFile({
			cloudPath,
			fileContent: result.buffer,
		});

		if (!upload || !upload.fileID) return;

		let url = await cloudUtil.getTempFileURLOne(upload.fileID);
		return { url };
	}

	/** 管理员按钮核销 */
	async checkinActivityJoin(activityJoinId, flag) {
		flag = Number(flag);
		let data = {
			ACTIVITY_JOIN_IS_CHECKIN: flag,
			ACTIVITY_JOIN_CHECKIN_TIME: flag == 1 ? timeUtil.time() : 0
		};
		await ActivityJoinModel.edit(activityJoinId, data);
	}

	/** 管理员扫码核销 */
	async scanActivityJoin(activityId, code) {
		let where = {
			ACTIVITY_JOIN_ACTIVITY_ID: activityId,
			ACTIVITY_JOIN_CODE: code,
			ACTIVITY_JOIN_STATUS: ActivityJoinModel.STATUS.SUCC
		};
		let activityJoin = await ActivityJoinModel.getOne(where);
		if (!activityJoin)
			this.AppError('核验码无效或该报名未通过审核');

		if (activityJoin.ACTIVITY_JOIN_IS_CHECKIN == 1)
			this.AppError('该报名已经签到，无须重复核销');

		await ActivityJoinModel.edit(activityJoin._id, {
			ACTIVITY_JOIN_IS_CHECKIN: 1,
			ACTIVITY_JOIN_CHECKIN_TIME: timeUtil.time()
		});

		return { ret: '核销成功' };
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

	/**导出报名数据 (含组织者自定义字段) */
	async exportActivityJoinDataExcel({
		activityId,
		status
	}) {
		// 取出活动，用于确定自定义字段的列顺序与标题
		let activity = await ActivityModel.getOne(activityId, 'ACTIVITY_TITLE,ACTIVITY_JOIN_FORMS');
		if (!activity)
			this.AppError('活动不存在');

		let joinForms = activity.ACTIVITY_JOIN_FORMS || [];

		// 表头: 固定列 + 每个自定义字段一列
		let header = ['报名时间', '状态', '是否签到'];
		for (let k = 0; k < joinForms.length; k++) {
			if (joinForms[k].type == 'image' || joinForms[k].type == 'content') continue;
			header.push(joinForms[k].title);
		}

		// 查询报名记录
		let where = {
			ACTIVITY_JOIN_ACTIVITY_ID: activityId
		};
		status = Number(status);
		if (status >= 0) where.ACTIVITY_JOIN_STATUS = status;

		let orderBy = { ACTIVITY_JOIN_ADD_TIME: 'desc' };
		let list = await ActivityJoinModel.getAll(where, '*', orderBy, 5000);

		// 组装二维数组
		let data = [header];
		for (let i = 0; i < list.length; i++) {
			let join = list[i];
			let row = [];
			row.push(timeUtil.timestamp2Time(join.ACTIVITY_JOIN_ADD_TIME));
			row.push(this._getJoinStatusText(join.ACTIVITY_JOIN_STATUS));
			row.push(join.ACTIVITY_JOIN_IS_CHECKIN == 1 ? '已签到' : '未签到');

			// 按字段定义顺序取值，保证与表头对齐
			let forms = join.ACTIVITY_JOIN_FORMS || [];
			for (let k = 0; k < joinForms.length; k++) {
				if (joinForms[k].type == 'image' || joinForms[k].type == 'content') continue;
				row.push(dataUtil.getValByForm(forms, joinForms[k].mark, joinForms[k].title));
			}
			data.push(row);
		}

		let total = list.length;
		return await exportUtil.exportDataExcel(EXPORT_ACTIVITY_JOIN_DATA_KEY, activity.ACTIVITY_TITLE + '-报名名单', total, data);
	}

	// 报名状态中文描述
	_getJoinStatusText(status) {
		switch (Number(status)) {
			case ActivityJoinModel.STATUS.WAIT: return ActivityJoinModel.STATUS_DESC.WAIT;
			case ActivityJoinModel.STATUS.SUCC: return ActivityJoinModel.STATUS_DESC.SUCC;
			case ActivityJoinModel.STATUS.ADMIN_CANCEL: return ActivityJoinModel.STATUS_DESC.ADMIN_CANCEL;
			default: return '';
		}
	}
}

module.exports = AdminActivityService;