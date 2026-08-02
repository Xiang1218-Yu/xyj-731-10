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

}

module.exports = MyService;
