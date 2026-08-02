/**
 * Notes: 用户中心模块控制器
 * Date: 2021-03-15 19:20:00 
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 */

const BaseProjectController = require('./base_project_controller.js');

const timeUtil = require('../../../framework/utils/time_util.js');

const ActivityJoinModel = require('../model/activity_join_model.js');
const EnrollJoinModel = require('../model/enroll_join_model.js');
const EnrollUserModel = require('../model/enroll_user_model.js');

let FavModel = null;
try {
	FavModel = require('../model/fav_model.js');
} catch (e) {
	FavModel = null;
}

class MyController extends BaseProjectController {

	/** 获取我的统计数据 */
	async getMyStat() {
		let userId = this._userId;

		// 我报名的活动总数
		let activityJoinCnt = await ActivityJoinModel.count({
			ACTIVITY_JOIN_USER_ID: userId
		});

		// 成功报名数
		let activitySuccCnt = await ActivityJoinModel.count({
			ACTIVITY_JOIN_USER_ID: userId,
			ACTIVITY_JOIN_STATUS: ActivityJoinModel.STATUS.SUCC
		});

		// 待审核数
		let activityWaitCnt = await ActivityJoinModel.count({
			ACTIVITY_JOIN_USER_ID: userId,
			ACTIVITY_JOIN_STATUS: ActivityJoinModel.STATUS.WAIT
		});

		// 已签到数
		let activityCheckinCnt = await ActivityJoinModel.count({
			ACTIVITY_JOIN_USER_ID: userId,
			ACTIVITY_JOIN_IS_CHECKIN: 1
		});

		// 我的打卡总天数
		let enrollJoinCnt = await EnrollJoinModel.count({
			ENROLL_JOIN_USER_ID: userId
		});

		// 打卡活动数
		let enrollActivityCnt = await EnrollUserModel.count({
			ENROLL_USER_MINI_OPENID: userId
		});

		// 我的收藏数
		let favCnt = 0;
		if (FavModel) {
			favCnt = await FavModel.count({
				FAV_USER_ID: userId
			});
		}

		// 最近30天打卡趋势（按天统计）
		let now = timeUtil.time();
		let thirtyDaysAgo = now - 30 * 86400 * 1000;

		let enrollJoins = await EnrollJoinModel.getAllBig({
			ENROLL_JOIN_USER_ID: userId,
			ENROLL_JOIN_ADD_TIME: ['between', thirtyDaysAgo, now]
		}, 'ENROLL_JOIN_DAY', { ENROLL_JOIN_ADD_TIME: 'asc' }, 10000);

		// 按日期分组统计
		let trendMap = {};
		for (let k = 0; k < enrollJoins.length; k++) {
			let day = enrollJoins[k].ENROLL_JOIN_DAY;
			if (!day) continue;
			if (!trendMap[day]) trendMap[day] = 0;
			trendMap[day]++;
		}

		// 构建最近30天数组
		let last30DaysTrend = [];
		for (let i = 29; i >= 0; i--) {
			let ts = now - i * 86400 * 1000;
			let day = timeUtil.timestamp2Time(ts, 'Y-M-D');
			last30DaysTrend.push({
				date: day,
				count: trendMap[day] || 0
			});
		}

		return {
			activityJoinCnt,
			activitySuccCnt,
			activityWaitCnt,
			activityCheckinCnt,
			enrollJoinCnt,
			enrollActivityCnt,
			favCnt,
			last30DaysTrend
		};
	}

}

module.exports = MyController;
