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
const NoticeModel = require('../../model/notice_model.js');
const exportUtil = require('../../../../framework/utils/export_util.js');
const miniLib = require('../../../../framework/lib/mini_lib.js');
const projectConfig = require('../../public/project_config.js');

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

		// 组装活动数据入库（含组织者自定义的报名字段 joinForms）
		let data = {
			ACTIVITY_TITLE: title,
			ACTIVITY_CATE_ID: cateId,
			ACTIVITY_CATE_NAME: cateName,
			ACTIVITY_ORDER: order,

			ACTIVITY_MAX_CNT: maxCnt,
			ACTIVITY_START: timeUtil.time2Timestamp(start),
			ACTIVITY_END: timeUtil.time2Timestamp(end),
			ACTIVITY_STOP: timeUtil.time2Timestamp(stop),

			ACTIVITY_ADDRESS: address,
			ACTIVITY_ADDRESS_GEO: addressGeo,

			ACTIVITY_CANCEL_SET: cancelSet,
			ACTIVITY_CHECK_SET: checkSet,
			ACTIVITY_IS_MENU: isMenu,

			ACTIVITY_FORMS: forms,
			ACTIVITY_OBJ: dataUtil.dbForms2Obj(forms, true),
			ACTIVITY_JOIN_FORMS: joinForms,
		};

		let id = await ActivityModel.insert(data);

		// 生成活动专属小程序码（失败不影响活动创建）
		try {
			let qr = await this.genDetailQr('activity', id);
			if (qr) await ActivityModel.edit(id, { ACTIVITY_QR: qr });
		} catch (err) {
			console.error('生成活动小程序码失败', err);
		}

		return { id };
	}

	//#############################
	/** 清空 */
	async clearActivityAll(activityId) {
		// 删除该活动下所有报名记录
		let where = {
			ACTIVITY_JOIN_ACTIVITY_ID: activityId
		};
		await ActivityJoinModel.del(where);

		// 重新统计报名人数
		let activityService = new ActivityService();
		await activityService.statActivityJoin(activityId);
	}


	/**删除数据 */
	async delActivity(id) {
		let activity = await ActivityModel.getOne(id);
		if (!activity) return;

		// 删除活动记录
		await ActivityModel.del(id);

		// 一并删除该活动的所有报名记录
		await ActivityJoinModel.del({
			ACTIVITY_JOIN_ACTIVITY_ID: id
		});

		// 清理活动相关的云存储图片文件
		if (activity.ACTIVITY_FORMS)
			await cloudUtil.handlerCloudFilesForForms(activity.ACTIVITY_FORMS, []);
	}

	/** 批量删除活动（ids为记录_id数组，同步删除各活动的所有报名记录） */
	async batchDelActivity(ids) {
		if (!Array.isArray(ids) || !ids.length)
			this.AppError('请选择要操作的活动');

		// 批量删除活动记录
		let where = {
			_id: ['in', ids]
		};
		let cnt = await ActivityModel.del(where);

		// 一并删除这些活动的所有报名记录（参考单个删除的做法）
		await ActivityJoinModel.del({
			ACTIVITY_JOIN_ACTIVITY_ID: ['in', ids]
		});

		return { cnt };
	}

	/** 批量设置活动状态（status：1=启用 0=停用） */
	async batchStatusActivity(ids, status) {
		if (!Array.isArray(ids) || !ids.length)
			this.AppError('请选择要操作的活动');

		status = Number(status);
		if (![ActivityModel.STATUS.COMM, ActivityModel.STATUS.UNUSE].includes(status))
			this.AppError('状态值不正确');

		// 批量更新状态
		let where = {
			_id: ['in', ids]
		};
		let cnt = await ActivityModel.edit(where, { ACTIVITY_STATUS: status });
		return { cnt };
	}

	// 更新forms信息
	async updateActivityForms({
		id,
		hasImageForms
	}) {
		let activity = await ActivityModel.getOne(id);
		if (!activity) this.AppError('该活动不存在');

		// 将forms中含图片的字段替换为已上传的云文件ID
		let forms = activity.ACTIVITY_FORMS;
		for (let k = 0; k < hasImageForms.length; k++) {
			for (let j = 0; j < forms.length; j++) {
				if (forms[j].mark == hasImageForms[k].mark) {
					forms[j].val = hasImageForms[k].val;
					break;
				}
			}
		}

		// 同步更新冗余对象
		let obj = dataUtil.dbForms2Obj(forms, true);

		await ActivityModel.edit(id, {
			ACTIVITY_FORMS: forms,
			ACTIVITY_OBJ: obj
		});
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

		let activity = await ActivityModel.getOne(id);
		if (!activity) this.AppError('该活动不存在');

		// 清理被删除或替换的云存储图片文件
		if (activity.ACTIVITY_FORMS)
			await cloudUtil.handlerCloudFilesForForms(activity.ACTIVITY_FORMS, forms);

		// 组装更新数据（含组织者自定义的报名字段 joinForms）
		let data = {
			ACTIVITY_TITLE: title,
			ACTIVITY_CATE_ID: cateId,
			ACTIVITY_CATE_NAME: cateName,
			ACTIVITY_ORDER: order,

			ACTIVITY_MAX_CNT: maxCnt,
			ACTIVITY_START: timeUtil.time2Timestamp(start),
			ACTIVITY_END: timeUtil.time2Timestamp(end),
			ACTIVITY_STOP: timeUtil.time2Timestamp(stop),

			ACTIVITY_ADDRESS: address,
			ACTIVITY_ADDRESS_GEO: addressGeo,

			ACTIVITY_CANCEL_SET: cancelSet,
			ACTIVITY_CHECK_SET: checkSet,
			ACTIVITY_IS_MENU: isMenu,

			ACTIVITY_FORMS: forms,
			ACTIVITY_OBJ: dataUtil.dbForms2Obj(forms, true),
			ACTIVITY_JOIN_FORMS: joinForms,
		};

		await ActivityModel.edit(id, data);

		// 返回最新的报名状态描述，供前端列表即时刷新
		let newActivity = Object.assign({}, activity, data);
		let activityService = new ActivityService();
		return {
			statusDesc: activityService.getJoinStatusDesc(newActivity)
		};
	}

	/**修改状态 */
	async statusActivity(id, status) {
		status = Number(status);

		let activity = await ActivityModel.getOne(id);
		if (!activity) this.AppError('该活动不存在');

		await ActivityModel.edit(id, {
			ACTIVITY_STATUS: status
		});

		// 返回最新的报名状态描述，供前端列表即时刷新
		activity.ACTIVITY_STATUS = status;
		let activityService = new ActivityService();
		return {
			statusDesc: activityService.getJoinStatusDesc(activity)
		};
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

		let activityJoin = await ActivityJoinModel.getOne(activityJoinId);
		if (!activityJoin) this.AppError('该报名记录不存在');

		// 状态未发生变化时无须处理
		if (activityJoin.ACTIVITY_JOIN_STATUS == status) return;

		let activity = await ActivityModel.getOne(activityJoin.ACTIVITY_JOIN_ACTIVITY_ID);
		if (!activity) this.AppError('该活动不存在');

		// 更新报名状态与理由
		let data = {
			ACTIVITY_JOIN_STATUS: status
		};
		if (status == ActivityJoinModel.STATUS.ADMIN_CANCEL) {
			// 审核拒绝：记录理由并重置签到状态
			data.ACTIVITY_JOIN_REASON = reason;
			data.ACTIVITY_JOIN_IS_CHECKIN = 0;
		} else {
			data.ACTIVITY_JOIN_REASON = '';
		}

		// 功能点：防并发竞态 —— 以"原状态"为条件做原子更新，更新数为0说明该记录已被其他并发操作处理
		let oldStatus = activityJoin.ACTIVITY_JOIN_STATUS;
		let updated = await ActivityJoinModel.edit({
			_id: activityJoinId,
			ACTIVITY_JOIN_STATUS: oldStatus
		}, data);
		if (!updated)
			this.AppError('该报名记录状态已被其他操作变更，请刷新后重试');

		// 重新统计活动报名人数（原子更新成功后再统计，保证计数基于最新状态）
		let activityService = new ActivityService();
		let joinCnt = await activityService.statActivityJoin(activity._id);

		// 功能点：防并发超员 —— 通过后若实际占用名额超过上限，回滚本次通过（先更新后校验+回滚，杜绝并发下超出人数上限）
		if (status == ActivityJoinModel.STATUS.SUCC && activity.ACTIVITY_MAX_CNT > 0
			&& joinCnt > activity.ACTIVITY_MAX_CNT) {
			await ActivityJoinModel.edit({
				_id: activityJoinId,
				ACTIVITY_JOIN_STATUS: status
			}, {
				ACTIVITY_JOIN_STATUS: oldStatus,
				ACTIVITY_JOIN_REASON: ''
			});
			await activityService.statActivityJoin(activity._id); // 回滚后再次重算
			this.AppError('该活动名额已满，无法再通过审核');
		}

		// 发送审核结果订阅消息通知
		await this.sendActivityJoinNotice(activityJoin, activity, status, reason);

		// 写入站内通知（订阅消息模板ID需配置不可靠，站内通知作为可靠兜底）
		await this.insertActivityJoinNotice(activityJoin, activity, status, reason);
	}

	/** 写入报名审核结果站内通知（批量审核内部循环调用单个审核，无需重复插入） */
	async insertActivityJoinNotice(activityJoin, activity, status, reason = '') {
		// 仅审核通过/拒绝时生成站内通知
		if (![ActivityJoinModel.STATUS.SUCC, ActivityJoinModel.STATUS.ADMIN_CANCEL].includes(status)) return;

		let title = (status == ActivityJoinModel.STATUS.SUCC) ? '报名审核通过' : '报名审核未通过';
		let desc = '您报名的活动「' + activity.ACTIVITY_TITLE + '」' + title;
		if (status == ActivityJoinModel.STATUS.ADMIN_CANCEL && reason)
			desc += '，原因：' + reason; // 拒绝时附带拒绝理由

		let data = {
			NOTICE_USER_ID: activityJoin.ACTIVITY_JOIN_USER_ID, // 接收人
			NOTICE_TYPE: NoticeModel.TYPE.ACTIVITY_JOIN, // 通知类型：报名审核结果
			NOTICE_TITLE: title,
			NOTICE_DESC: desc,
			NOTICE_ACTIVITY_ID: activity._id,
			NOTICE_JOIN_ID: activityJoin._id,
			NOTICE_READ: NoticeModel.READ.UNREAD // 默认未读
		};
		await NoticeModel.insert(data);
	}

	/** 发送报名审核结果订阅消息（需在 project_config.js 配置模板ID） */
	async sendActivityJoinNotice(activityJoin, activity, status, reason = '') {
		let tid = projectConfig.ACTIVITY_JOIN_NOTICE_TID;
		if (!tid) return; // 未配置模板ID则不发送

		let statusDesc = (status == ActivityJoinModel.STATUS.SUCC) ? '审核通过' : '审核未通过';
		let memo = (status == ActivityJoinModel.STATUS.SUCC)
			? '请按时参加活动'
			: (reason || '请查看报名详情');

		let body = {
			touser: activityJoin.ACTIVITY_JOIN_USER_ID,
			template_id: tid,
			page: 'projects/activitybook/pages/activity/my_join_detail/activity_my_join_detail?id=' + activityJoin._id,
			data: {
				thing1: { value: miniLib.fmtThing(activity.ACTIVITY_TITLE) },
				phrase2: { value: miniLib.fmtPhrase(statusDesc) },
				thing3: { value: miniLib.fmtThing(memo) }
			}
		};
		await miniLib.sendMiniOnceTempMsg(body, 'activityJoinStatus');
	}


	/** 取消某项目的所有报名记录 */
	async cancelActivityJoinAll(activityId, reason) {
		let activity = await ActivityModel.getOne(activityId);
		if (!activity) this.AppError('该活动不存在');

		// 将待审核与成功的记录全部置为审核未过
		let where = {
			ACTIVITY_JOIN_ACTIVITY_ID: activityId,
			ACTIVITY_JOIN_STATUS: ['in', [ActivityJoinModel.STATUS.WAIT, ActivityJoinModel.STATUS.SUCC]]
		};
		let data = {
			ACTIVITY_JOIN_STATUS: ActivityJoinModel.STATUS.ADMIN_CANCEL,
			ACTIVITY_JOIN_REASON: reason,
			ACTIVITY_JOIN_IS_CHECKIN: 0
		};
		await ActivityJoinModel.edit(where, data);

		// 重新统计报名人数
		let activityService = new ActivityService();
		await activityService.statActivityJoin(activityId);
	}

	/** 删除报名 */
	async delActivityJoin(activityJoinId) {
		let activityJoin = await ActivityJoinModel.getOne(activityJoinId);
		if (!activityJoin) return;

		await ActivityJoinModel.del(activityJoinId);

		// 重新统计报名人数
		let activityService = new ActivityService();
		await activityService.statActivityJoin(activityJoin.ACTIVITY_JOIN_ACTIVITY_ID);
	}

	/** 批量审核报名（status：1=通过 99=拒绝，reason为拒绝时统一填写的理由） */
	async batchStatusActivityJoin(activityId, ids, status, reason = '') {
		if (!Array.isArray(ids) || !ids.length)
			this.AppError('请选择要操作的报名记录');

		status = Number(status);
		if (![ActivityJoinModel.STATUS.SUCC, ActivityJoinModel.STATUS.ADMIN_CANCEL].includes(status))
			this.AppError('状态值不正确');

		let activity = await ActivityModel.getOne(activityId);
		if (!activity) this.AppError('该活动不存在');

		// 功能点：批量通过前统一预检名额，避免"部分成功部分失败"
		if (status == ActivityJoinModel.STATUS.SUCC && activity.ACTIVITY_MAX_CNT > 0) {
			// 本次实际将新增通过的条数（仅待审核/未过审的记录会发生状态变化）
			let passCnt = await ActivityJoinModel.count({
				ACTIVITY_JOIN_ACTIVITY_ID: activityId,
				_id: ['in', ids],
				ACTIVITY_JOIN_STATUS: ['in', [ActivityJoinModel.STATUS.WAIT, ActivityJoinModel.STATUS.ADMIN_CANCEL]]
			});
			// 当前已占用名额（待审核与成功的记录均占用名额）
			let curCnt = await ActivityJoinModel.count({
				ACTIVITY_JOIN_ACTIVITY_ID: activityId,
				ACTIVITY_JOIN_STATUS: ['in', [ActivityJoinModel.STATUS.WAIT, ActivityJoinModel.STATUS.SUCC]]
			});
			if (curCnt + passCnt > activity.ACTIVITY_MAX_CNT) {
				let remain = Math.max(0, activity.ACTIVITY_MAX_CNT - curCnt);
				this.AppError('名额不足：当前已占' + curCnt + '/' + activity.ACTIVITY_MAX_CNT + '人，本次最多还能通过' + remain + '人，请调整勾选数量');
			}
		}

		// 功能点：逐条流转状态并收集失败项（复用单条审核逻辑：原子状态流转、超员回滚、重算人数、发送通知），
		// 单条失败不中断整体批次，最终返回成功/失败明细，杜绝"部分成功部分失败却无任何反馈"
		let cnt = 0;
		let failList = [];
		for (let k = 0; k < ids.length; k++) {
			try {
				await this.statusActivityJoin(ids[k], status, reason);
				cnt++;
			} catch (err) {
				console.error('批量审核第' + (k + 1) + '条失败 id=' + ids[k], err);
				failList.push(err.message || '未知错误');
			}
		}

		// 全部失败时直接报错（视为本次操作失败）
		if (cnt == 0 && failList.length > 0)
			this.AppError('操作失败：' + failList[0]);

		return { cnt, failCnt: failList.length, failMsg: failList[0] || '' };
	}

	/** 批量删除报名记录（ids为记录_id数组，删除后重算报名人数） */
	async batchDelActivityJoin(activityId, ids) {
		if (!Array.isArray(ids) || !ids.length)
			this.AppError('请选择要操作的报名记录');

		let activity = await ActivityModel.getOne(activityId);
		if (!activity) this.AppError('该活动不存在');

		// 批量删除该活动下的报名记录
		let where = {
			ACTIVITY_JOIN_ACTIVITY_ID: activityId,
			_id: ['in', ids]
		};
		let cnt = await ActivityJoinModel.del(where);

		// 重新统计报名人数
		let activityService = new ActivityService();
		await activityService.statActivityJoin(activityId);

		return { cnt };
	}

	/** 自助签到码 */
	async genActivitySelfCheckinQr(page, activityId) {
		let activity = await ActivityModel.getOne(activityId);
		if (!activity) this.AppError('该活动不存在');

		// 生成自助签到小程序码
		let cloud = cloudBase.getCloud();
		if (page.startsWith('/')) page = page.substring(1);

		let result = await cloud.openapi.wxacode.getUnlimited({
			scene: activityId, // 自助签到页直接将scene作为活动ID使用
			width: 280,
			check_path: false,
			page
		});

		let cloudPath = this.getProjectId() + '/activity/' + activityId + '/self_checkin_qr.png';
		let upload = await cloud.uploadFile({
			cloudPath,
			fileContent: result.buffer,
		});
		if (!upload || !upload.fileID) return;

		let ret = await cloudUtil.getTempFileURLOne(upload.fileID);
		return ret + '?rd=' + this._timestamp;
	}

	/** 管理员按钮核销 */
	async checkinActivityJoin(activityJoinId, flag) {
		flag = Number(flag);

		let activityJoin = await ActivityJoinModel.getOne(activityJoinId);
		if (!activityJoin) this.AppError('该报名记录不存在');

		if (activityJoin.ACTIVITY_JOIN_STATUS != ActivityJoinModel.STATUS.SUCC)
			this.AppError('仅报名成功的记录可以核销');

		// 更新签到状态与签到时间
		let data = {
			ACTIVITY_JOIN_IS_CHECKIN: flag
		};
		if (flag == 1)
			data.ACTIVITY_JOIN_CHECKIN_TIME = this._timestamp;
		await ActivityJoinModel.edit(activityJoinId, data);
	}

	/** 管理员扫码核销 */
	async scanActivityJoin(activityId, code) {
		let where = {
			ACTIVITY_JOIN_ACTIVITY_ID: activityId,
			ACTIVITY_JOIN_CODE: code
		};
		let activityJoin = await ActivityJoinModel.getOne(where);
		if (!activityJoin) this.AppError('错误的报名码，请重新扫码');

		if (activityJoin.ACTIVITY_JOIN_STATUS != ActivityJoinModel.STATUS.SUCC)
			this.AppError('该报名未成功，无法核销');

		if (activityJoin.ACTIVITY_JOIN_IS_CHECKIN == 1)
			this.AppError('该报名已核销，无须重复核销');

		// 核销成功，记录签到状态与时间
		let data = {
			ACTIVITY_JOIN_IS_CHECKIN: 1,
			ACTIVITY_JOIN_CHECKIN_TIME: this._timestamp
		};
		await ActivityJoinModel.edit(activityJoin._id, data);
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
		let activity = await ActivityModel.getOne(activityId);
		if (!activity) this.AppError('该活动不存在');

		// 按状态筛选报名记录，999表示全部
		status = Number(status);
		let where = {
			ACTIVITY_JOIN_ACTIVITY_ID: activityId
		};
		if (status != 999) where.ACTIVITY_JOIN_STATUS = status;

		let orderBy = {
			ACTIVITY_JOIN_ADD_TIME: 'asc'
		};
		let list = await ActivityJoinModel.getAllBig(where, '*', orderBy);

		// 组装表头：固定列 + 组织者自定义的报名字段列
		let joinForms = activity.ACTIVITY_JOIN_FORMS || [];
		let titleArr = ['序号', '状态', '报名时间'];
		for (let k = 0; k < joinForms.length; k++) {
			titleArr.push(joinForms[k].title);
		}
		titleArr.push('核销码', '签到状态', '签到时间', '未通过理由');

		// 组装表数据
		let data = [titleArr];
		for (let k = 0; k < list.length; k++) {
			let node = list[k];

			// 状态描述
			let statusDesc = '待审核';
			if (node.ACTIVITY_JOIN_STATUS == ActivityJoinModel.STATUS.SUCC)
				statusDesc = '报名成功';
			else if (node.ACTIVITY_JOIN_STATUS == ActivityJoinModel.STATUS.ADMIN_CANCEL)
				statusDesc = '审核未通过';

			let arr = [
				k + 1,
				statusDesc,
				timeUtil.timestamp2Time(node.ACTIVITY_JOIN_ADD_TIME, 'Y-M-D h:m:s')
			];

			// 自定义报名字段列（按字段定义顺序取值）
			for (let j = 0; j < joinForms.length; j++) {
				let val = dataUtil.getValByForm(node.ACTIVITY_JOIN_FORMS, joinForms[j].mark, joinForms[j].title);
				if (Array.isArray(val)) val = val.join(','); //多选值拼为逗号分隔
				arr.push(val);
			}

			arr.push(node.ACTIVITY_JOIN_CODE);
			arr.push(node.ACTIVITY_JOIN_IS_CHECKIN == 1 ? '已签到' : '未签到');
			arr.push(node.ACTIVITY_JOIN_CHECKIN_TIME ? timeUtil.timestamp2Time(node.ACTIVITY_JOIN_CHECKIN_TIME, 'Y-M-D h:m:s') : '');
			arr.push(node.ACTIVITY_JOIN_REASON || '');

			data.push(arr);
		}

		// 列宽设定
		let cols = [{ wch: 6 }, { wch: 12 }, { wch: 20 }];
		for (let k = 0; k < joinForms.length; k++) cols.push({ wch: 20 });
		cols.push({ wch: 18 }, { wch: 10 }, { wch: 20 }, { wch: 25 });
		let options = {
			'!cols': cols
		};

		return await exportUtil.exportDataExcel(EXPORT_ACTIVITY_JOIN_DATA_KEY, '活动报名名单', list.length, data, options);
	}
}

module.exports = AdminActivityService;