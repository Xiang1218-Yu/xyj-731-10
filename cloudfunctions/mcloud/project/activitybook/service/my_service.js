/**
 * Notes: 用户中心模块业务逻辑
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2026-08-02 10:00:00
 */

const BaseProjectService = require('./base_project_service.js');
const timeUtil = require('../../../framework/utils/time_util.js');
const ActivityJoinModel = require('../model/activity_join_model.js');
const EnrollJoinModel = require('../model/enroll_join_model.js');
const FavModel = require('../model/fav_model.js');
const NoticeModel = require('../model/notice_model.js');

class MyService extends BaseProjectService {

	/** 我的数据统计（功能点：我的页面数据统计卡片） */
	async getMyDataStat(userId) {

		// 报名活动次数
		let activityJoinCnt = await ActivityJoinModel.count({
			ACTIVITY_JOIN_USER_ID: userId
		});

		// 参与活动次数（报名成功）
		let activityJoinSuccCnt = await ActivityJoinModel.count({
			ACTIVITY_JOIN_USER_ID: userId,
			ACTIVITY_JOIN_STATUS: ActivityJoinModel.STATUS.SUCC
		});

		// 打卡次数
		let enrollJoinWhere = {
			ENROLL_JOIN_USER_ID: userId,
			ENROLL_JOIN_STATUS: EnrollJoinModel.STATUS.SUCC
		};
		let enrollJoinCnt = await EnrollJoinModel.count(enrollJoinWhere);

		// 打卡天数（按打卡日期去重统计）
		let enrollDayCnt = await EnrollJoinModel.distinctCnt(enrollJoinWhere, 'ENROLL_JOIN_DAY');

		// 收藏数
		let favCnt = await FavModel.count({
			FAV_USER_ID: userId
		});

		// 近7天每日打卡次数（功能点：柱状图数据，按打卡日期分组聚合）
		let startDay = timeUtil.time('Y-M-D', -86400 * 6);
		let endDay = timeUtil.time('Y-M-D');
		let groupRet = await EnrollJoinModel.groupCount({
			ENROLL_JOIN_USER_ID: userId,
			ENROLL_JOIN_STATUS: EnrollJoinModel.STATUS.SUCC,
			ENROLL_JOIN_DAY: ['between', startDay, endDay]
		}, 'ENROLL_JOIN_DAY') || {};

		let weekList = [];
		for (let k = 6; k >= 0; k--) {
			let day = timeUtil.time('Y-M-D', -86400 * k);
			weekList.push({
				day,
				label: day.substring(5), // 取 M-D 作为图表横坐标
				cnt: groupRet['ENROLL_JOIN_DAY_' + day] || 0
			});
		}

		return {
			activityJoinCnt,
			activityJoinSuccCnt,
			enrollJoinCnt,
			enrollDayCnt,
			favCnt,
			weekList
		};
	}

	/** 我的站内通知列表（功能点：站内通知中心，分页按时间倒序） */
	async getMyNoticeList(userId, {
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		page,
		size,
		isTotal = true,
		oldTotal = 0
	}) {
		orderBy = orderBy || {
			'NOTICE_ADD_TIME': 'desc'
		};
		let fields = 'NOTICE_TYPE,NOTICE_TITLE,NOTICE_DESC,NOTICE_ACTIVITY_ID,NOTICE_JOIN_ID,NOTICE_READ,NOTICE_ADD_TIME';

		let where = {
			NOTICE_USER_ID: userId // 仅查询本人的通知
		};

		return await NoticeModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/** 我的未读通知数（功能点：我的页面通知入口角标） */
	async getMyNoticeCnt(userId) {
		let cnt = await NoticeModel.count({
			NOTICE_USER_ID: userId,
			NOTICE_READ: NoticeModel.READ.UNREAD
		});

		return {
			cnt
		};
	}

	/** 标记某条通知已读（仅能操作本人的通知） */
	async readMyNotice(userId, noticeId) {
		let notice = await NoticeModel.getOne(noticeId);
		if (!notice) this.AppError('该通知不存在');

		// 仅允许标记自己的通知
		if (notice.NOTICE_USER_ID != userId) this.AppError('无权操作该通知');

		// 已读的无须重复处理
		if (notice.NOTICE_READ == NoticeModel.READ.READ) return;

		await NoticeModel.edit(noticeId, {
			NOTICE_READ: NoticeModel.READ.READ
		});
	}

}

module.exports = MyService;
