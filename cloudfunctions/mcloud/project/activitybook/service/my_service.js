/**
 * Notes: 用户中心模块业务逻辑 (个人数据统计)
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2026-08-02 07:48:00 
 */

const BaseProjectService = require('./base_project_service.js');
const ActivityJoinModel = require('../model/activity_join_model.js');
const EnrollJoinModel = require('../model/enroll_join_model.js');
const FavModel = require('../model/fav_model.js');

class MyService extends BaseProjectService {

	/**
	 * 获取"我的"页面可视化数据统计
	 * 返回: 报名活动数/已签到数/打卡次数/打卡天数/收藏数
	 */
	async getMyStat(userId) {
		// 报名成功的活动数
		let activityJoinCnt = await ActivityJoinModel.count({
			ACTIVITY_JOIN_USER_ID: userId,
			ACTIVITY_JOIN_STATUS: ActivityJoinModel.STATUS.SUCC
		});

		// 已签到的活动数
		let checkinCnt = await ActivityJoinModel.count({
			ACTIVITY_JOIN_USER_ID: userId,
			ACTIVITY_JOIN_STATUS: ActivityJoinModel.STATUS.SUCC,
			ACTIVITY_JOIN_IS_CHECKIN: 1
		});

		// 打卡总次数
		let enrollJoinCnt = await EnrollJoinModel.count({
			ENROLL_JOIN_USER_ID: userId,
			ENROLL_JOIN_STATUS: EnrollJoinModel.STATUS.SUCC
		});

		// 打卡天数 (按天去重)
		let enrollDayCnt = await EnrollJoinModel.distinctCnt({
			ENROLL_JOIN_USER_ID: userId,
			ENROLL_JOIN_STATUS: EnrollJoinModel.STATUS.SUCC
		}, 'ENROLL_JOIN_DAY');

		// 收藏数
		let favCnt = await FavModel.count({
			FAV_USER_ID: userId
		});

		return {
			activityJoinCnt, // 报名活动
			checkinCnt,      // 已签到
			enrollJoinCnt,   // 打卡次数
			enrollDayCnt,    // 打卡天数
			favCnt,          // 收藏数
		};
	}

}

module.exports = MyService;
