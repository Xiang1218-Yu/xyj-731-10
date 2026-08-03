/**
 * Notes: 用户中心业务逻辑
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2024-01-01 19:20:00 
 */

const BaseProjectService = require('./base_project_service.js');
const timeUtil = require('../../../framework/utils/time_util.js');

const ActivityJoinModel = require('../model/activity_join_model.js');
const EnrollJoinModel = require('../model/enroll_join_model.js');
const FavModel = require('../model/fav_model.js');
const UserModel = require('../model/user_model.js');

class MyService extends BaseProjectService {

	/** 获取我的统计数据 */
	async getMyStat(userId) {
		// 我报名的活动总数（待审核+成功）
		let activityJoinCnt = await ActivityJoinModel.count({
			ACTIVITY_JOIN_USER_ID: userId,
			ACTIVITY_JOIN_STATUS: ['in', [ActivityJoinModel.STATUS.WAIT, ActivityJoinModel.STATUS.SUCC]]
		});

		// 报名成功数
		let activitySuccCnt = await ActivityJoinModel.count({
			ACTIVITY_JOIN_USER_ID: userId,
			ACTIVITY_JOIN_STATUS: ActivityJoinModel.STATUS.SUCC
		});

		// 签到次数（成功且已签到）
		let checkinCnt = await ActivityJoinModel.count({
			ACTIVITY_JOIN_USER_ID: userId,
			ACTIVITY_JOIN_STATUS: ActivityJoinModel.STATUS.SUCC,
			ACTIVITY_JOIN_IS_CHECKIN: 1
		});

		// 打卡总次数（成功）
		let enrollJoinCnt = await EnrollJoinModel.count({
			ENROLL_JOIN_USER_ID: userId,
			ENROLL_JOIN_STATUS: EnrollJoinModel.STATUS.SUCC
		});

		// 打卡天数（distinct ENROLL_JOIN_DAY count）
		let enrollDayCnt = await EnrollJoinModel.distinctCnt({
			ENROLL_JOIN_USER_ID: userId,
			ENROLL_JOIN_STATUS: EnrollJoinModel.STATUS.SUCC
		}, 'ENROLL_JOIN_DAY');

		// 参与的打卡活动数（distinct ENROLL_JOIN_ENROLL_ID count）
		let enrollActivityCnt = await EnrollJoinModel.distinctCnt({
			ENROLL_JOIN_USER_ID: userId,
			ENROLL_JOIN_STATUS: EnrollJoinModel.STATUS.SUCC
		}, 'ENROLL_JOIN_ENROLL_ID');

		// 收藏数
		let favCnt = await FavModel.count({
			FAV_USER_ID: userId
		});

		// 最近30天打卡趋势
		let trend = await this._getEnrollTrend(userId, 30);

		return {
			activityJoinCnt,
			activitySuccCnt,
			checkinCnt,
			enrollJoinCnt,
			enrollDayCnt,
			enrollActivityCnt,
			favCnt,
			trend
		};
	}

	/** 获取最近N天打卡趋势 */
	async _getEnrollTrend(userId, days = 30) {
		let trend = [];
		let now = this._timestamp;

		// 计算起始日期（days天前的0点）
		let dayMs = 24 * 60 * 60 * 1000;
		let startDay = timeUtil.getDayFirstTimestamp(now - (days - 1) * dayMs);

		// 初始化最近days天，每天cnt=0
		let map = {};
		for (let i = 0; i < days; i++) {
			let ts = startDay + i * dayMs;
			let day = timeUtil.timestamp2Time(ts, 'Y-M-D');
			let label = timeUtil.timestamp2Time(ts, 'M-D');
			map[day] = { day: label, cnt: 0 };
			trend.push(map[day]);
		}

		// 查询最近days天的打卡记录，按天统计
		let where = {
			ENROLL_JOIN_USER_ID: userId,
			ENROLL_JOIN_STATUS: EnrollJoinModel.STATUS.SUCC,
			ENROLL_JOIN_ADD_TIME: ['>=', startDay]
		};
		let list = await EnrollJoinModel.getAllBig(where, 'ENROLL_JOIN_DAY,ENROLL_JOIN_ADD_TIME', { ENROLL_JOIN_ADD_TIME: 'asc' }, 10000);

		for (let k = 0; k < list.length; k++) {
			// ENROLL_JOIN_DAY 是日期字符串（Y-M-D），直接按天聚合
			let day = list[k].ENROLL_JOIN_DAY;
			if (day && map[day]) {
				map[day].cnt++;
			}
		}

		return trend;
	}
}

module.exports = MyService;
